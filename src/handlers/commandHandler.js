import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const commandsDirectory = fileURLToPath(
    new URL('../commands/', import.meta.url)
);

async function findCommandFiles(directory) {
    const entries = await readdir(directory, {
        withFileTypes: true
    });

    const files = await Promise.all(
        entries.map(async (entry) => {
            const entryPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                return findCommandFiles(entryPath);
            }

            if (entry.isFile() && entry.name.endsWith('.js')) {
                return [entryPath];
            }

            return [];
        })
    );

    return files.flat();
}

export async function loadCommands() {
    const files = await findCommandFiles(commandsDirectory);
    const commands = new Map();

    for (const file of files.sort()) {
        const module = await import(pathToFileURL(file).href);
        const command = module.default;

        if (
            !command?.data?.name ||
            typeof command.data.toJSON !== 'function' ||
            typeof command.execute !== 'function'
        ) {
            throw new Error(`Invalid command module: ${file}`);
        }

        if (commands.has(command.data.name)) {
            throw new Error(`Duplicate command: ${command.data.name}`);
        }

        commands.set(command.data.name, command);

        console.log(`Command loaded: /${command.data.name}`);
    }

    return commands;
}