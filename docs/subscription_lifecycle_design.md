# Twitch Subscription Lifecycle Design for Trailblazer

This document details the strategy for handling the transition of users between Free and Pro plans, specifically focusing on how to manage their widget limits and when to detect subscription expiration.

## Core Problem
Twitch does not provide a reliable "Subscription Expiration Time" field when validating a user's subscription token directly. Therefore, we cannot schedule a reliable background job to downgrade users exactly when their sub ends. 

To solve this, we use a hybrid **Webhook (Push) + Lazy Check (Pull)** approach.

---

## 1. Widget Strategy on Downgrade: The "User's Choice" Approach

When a user's Pro subscription expires and they are downgraded to Free, the system immediately restricts their active widgets. 

### Mechanism
- Set `enabled = false` for **ALL** of their active widgets.
- Do not guess which widget they want to keep. 

### User Experience
- The widgets stop working on their OBS broadcast immediately.
- When they log into the Trailblazer dashboard, a prominent banner informs them:
  > *"Your Pro plan has expired and your widgets have been paused. You can enable 1 widget on the Free plan, or upgrade to Pro to enable them all."*
- The user is empowered to choose which single widget remains active by toggling it back on.

### Advantages
- The system doesn't make assumptions that could confuse the user (e.g., leaving a minor widget enabled while disabling their main one).
- It drives high engagement to the dashboard, providing the perfect contextual moment to pitch a resubscription.

---

## 2. Detecting Subscription Changes: The Hybrid Approach

We use a combination of mechanisms to ensure real-time accuracy and reliability without excessive API polling.

### Phase 1: The Initial "Pull" (Signup / Login)
When a new or returning user logs into Trailblazer, we check their subscription status directly via the Twitch API. This handles users who were already subscribed *before* ever using Trailblazer.

1. App requests `checkUserSubscription(user.twitch_id, "broadcaster_id")`.
2. **If Subscribed:**
   - Calculate tier (e.g., `1000` = Tier 1).
   - Save to DB: `tier: 1, tier_expires_at: NOW + 24 hours`.
   - Cache in Redis: `user:tier:${user.id}` with `TTL = 1 DAY`.

*Note: We set a 24-hour expiration as a "safety net" (see Phase 3).*

### Phase 2: The Immediate "Push" (Twitch EventSub)
To know right away when a user *loses* their subscription, we rely on Twitch EventSub Webhooks. This is the primary trigger for downgrades.

1. Subscribe to the `channel.subscription.end` topic for our Broadcaster ID.
2. **When Webhook Fires:**
   ```json
   {
     "subscription": { "type": "channel.subscription.end" },
     "event": {
       "user_id": "123456", // Matches twitch_id
       "broadcaster_user_id": "135783794" 
     }
   }
   ```
3. **Backend Action:**
   - Find user by `twitch_id`.
   - Update DB: `tier = 0, tier_expires_at = null`.
   - Delete Redis cache key: `user:tier:${user.id}`.
   - **Enforce Limit:** Execute `UPDATE Widget SET enabled = false WHERE owner_id = ${user.id}`.
   - Emits a WebSocket event to frontend/OBS overlays to force immediate disconnect.

### Phase 3: The Maintenance "Pull" (Safety Net / Lazy Evaluation)
Webhooks can fail, be missed during server restarts, or drop due to network issues. To prevent users from having infinite "ghost" Pro status, we rely on the 24-hour `tier_expires_at` safety net.

Whenever the backend needs the user's tier (e.g., a widget loads, or the user opens the dashboard), it calls [getTier(userId)](file:///d:/Documents/Blaze/blaze-backend/src/services/user/user.service.ts#145-175):
1. Checked cached tier in Redis. If found, return it.
2. Check `tier_expires_at` in DB. If it's in the future, return it.
3. **If `tier_expires_at` is in the past:**
   - Call Twitch API `checkUserSubscription()`.
   - **If Twitch says NO SUBSCRIPTION:**
     - Update DB: `tier = 0, tier_expires_at = null`.
     - Delete Redis cache key.
     - **Enforce Limit:** Run downgrade logic (disable widgets).
   - **If Twitch says SUBSCRIBED:**
     - Update `tier_expires_at` to `NOW + 24 hours`.

---

## Example [getTier](file:///d:/Documents/Blaze/blaze-backend/src/services/user/user.service.ts#145-175) Implementation (Phase 3 Safety Net)

```typescript
async getTier(userId: string): Promise<number> {
    const cacheKey = `user:tier:${userId}`;
    const cachedTier = await redis.get(cacheKey);

    // 1. Fast Return: Cache
    if (cachedTier) return parseInt(cachedTier);

    const user = await this.get(userId);

    // 2. Medium Return: DB indicates valid sub
    if (user.tier_expires_at && user.tier_expires_at > new Date()) {
        redis.set(cacheKey, user.tier, TTL.ONE_DAY);
        return user.tier;
    }

    // 3. Slow/Safety Net: Re-verify with Twitch API
    const twitchUserAPI = await this.authService.createTwitchUserAPI(user.twitch_id);
    const subscription = await twitchUserAPI.subscriptions.checkUserSubscription(user.twitch_id, "135783794");

    if (!subscription) {
        // Did they previously have a tier? If so, they just lost it!
        if (user.tier > 0) {
            this.logger.info({ message: "User sub expired (caught by Lazy Pull)", data: { userId }});
            await this.userRepository.update(user.id, { tier: 0, tier_expires_at: null });
            await redis.del(cacheKey);
            
            // TODO: Enforce Limits (Disable Widgets)
            // await this.widgetService.disableAllActiveWidgets(user.id);
        }
        return 0;
    }

    // Re-verify successful, push out expiration 24 more hours
    const tier = parseInt(subscription.tier) / 1000;
    redis.set(cacheKey, tier, TTL.ONE_DAY);
    this.userRepository.update(user.id, {
        tier: tier,
        tier_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return tier;
}
```
