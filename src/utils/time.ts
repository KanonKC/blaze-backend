export function generateTierExpireDate() {
    const now = new Date()
    return new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))
}