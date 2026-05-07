import
{
  config,
  type EmulatorCapabilities,
  type PluginLoadingContextType,
  type PluginType,
} from "@simeonradivoev/gameflow-sdk";
import desc from "./package.json";
import path from "node:path";

export default class RYUJINXIntegration implements PluginType
{
  emulator = "RYUJINX";

  async load (ctx: PluginLoadingContextType)
  {
    ctx.hooks.games.emulatorLaunchSupport.tap(
      { name: desc.name, emulator: this.emulator },
      (ctx) =>
      {
        const baseCapabilities: EmulatorCapabilities[] = ["fullscreen"];
        if (ctx.source?.type === "store")
        {
          return {
            id: desc.name,
            supportLevel: "full",
            capabilities: [...baseCapabilities, "config", "saves"],
          };
        } else
        {
          return {
            id: desc.name,
            supportLevel: "partial",
            capabilities: [...baseCapabilities],
          };
        }
      },
    );

    ctx.hooks.games.postPlay.tapPromise({ name: desc.name },
      async ({ saveFolderSlots, validChangedSaveFiles, command }) =>
      {
        if (command.emulator !== this.emulator || !saveFolderSlots?.[this.emulator] || !command.metadata.romPath)
          return;

        validChangedSaveFiles[this.emulator] = {
          cwd: saveFolderSlots[this.emulator]!.cwd,
          shared: true,
          subPath: "**/*",
          isGlob: true,
        };
      },
    );

    ctx.hooks.games.emulatorLaunch.tapPromise(
      { name: desc.name, emulator: this.emulator },
      async (ctx) =>
      {
        const args: string[] = [];

        if (config.get("launchInFullscreen"))
          args.push(`--fullscreen`);

        if (ctx.autoValidCommand.metadata.romPath)
        {
          args.push(ctx.autoValidCommand.metadata.romPath);
        }

        if (ctx.autoValidCommand.emulatorSource === 'store')
        {
          args.push(`-r`, path.join(config.get("downloadPath"), "storage", this.emulator));

          const savesPath = path.join(config.get("downloadPath"), "storage", this.emulator, "bis", 'user', 'save');
          return { args, savesPath: { [this.emulator]: { cwd: savesPath } } };
        }

        return { args };
      },
    );
  }
}
