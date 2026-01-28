import jwt from "jsonwebtoken";

console.log(jwt.sign(
    { id: "cmkoexmiw0000awv42irxs8yh", username: "kanonkc", displayName: "KanonKC", avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/3885c66b-2f80-4979-a6a4-d146c91bc7c8-profile_image-300x300.png", twitchId: "135783794" },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "15m" }
))