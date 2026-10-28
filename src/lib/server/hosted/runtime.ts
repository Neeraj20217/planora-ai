import "server-only";
import { checkBotId } from "botid/server";
import { createHostedSecurity, hostedConfig } from "./security";

export function hostedSecurity() {
  const { config, command } = hostedConfig();
  return createHostedSecurity(config, command, async () => {
    const result = await checkBotId({
      developmentOptions: { isDevelopment: false },
      advancedOptions: { checkLevel: "basic" },
    });
    return (
      result.isBot === false &&
      result.isHuman === true &&
      result.bypassed === false
    );
  });
}
