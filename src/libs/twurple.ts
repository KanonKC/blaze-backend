import { ApiClient } from "@twurple/api";
import { AppTokenAuthProvider } from "@twurple/auth";

const clientId = "lnn0xjhakjukg3r77tgnjpquxt1y2t"
const clientSecret = "v6jct9yi6j35maiql4eqwa1263ybka"

const authProvider = new AppTokenAuthProvider(clientId, clientSecret)
// const staticAuthProvider = new StaticAuthProvider(clientId, clientSecret)
export const twitchAppAPI = new ApiClient({ authProvider });
// export const twitchUserAPI = new ApiClient({ authProvider: staticAuthProvider });
