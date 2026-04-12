// Inline URL Utils for favicon functionality
import type {Environment} from "../types/environment.ts";

export class UrlUtils {
    static detectCurrentEnvironment(currentUrl: string, environments: Environment[]): Environment | null {
        for (const env of environments) {
            try {
                const envUrl = new URL(env.baseUrl);
                const currentUrlObj = new URL(currentUrl);

                // Compare both hostname and port to properly distinguish localhost environments
                if (currentUrlObj.hostname === envUrl.hostname && currentUrlObj.port === envUrl.port) {
                    return env;
                }
            } catch (error) {
                // Silent error handling
            }
        }
        return null;
    }
}