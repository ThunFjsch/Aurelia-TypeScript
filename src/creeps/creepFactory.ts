export type CreepRole = 'miner' | 'hauler' | 'builder';

interface BodyBuilderContext {
  room: Room;
  source?: Source; // optional for roles that depend on a source
  energyPerTick?: number;
}

type BodyBuilder = (ctx: BodyBuilderContext) => BodyPartConstant[];

interface RoleDefinition {
  buildBody: BodyBuilder;
  memory: Partial<CreepMemory>; // base memory to assign
}

export const minerBuilder: BodyBuilder = ({ room, energyPerTick = 5 }) => {
  const rcl = room.controller?.level ?? 0;
  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  });

  const hasFullRCL2Economy = rcl >= 2 && extensions.length >= 5;

  if (hasFullRCL2Economy) {
    if (energyPerTick >= 10) return [WORK, WORK, WORK, WORK, WORK, MOVE];
    if (energyPerTick >= 5) return [WORK, WORK, WORK, MOVE];
  }

  return [WORK, WORK, MOVE];
};

const creepRoles: Record<CreepRole, RoleDefinition> = {
  miner: {
    buildBody: minerBuilder,
    memory: { role: 'miner' }
  },

  hauler: {
    buildBody: () => [CARRY, CARRY, MOVE],
    memory: { role: 'hauler' }
  },

  builder: {
    buildBody: () => [WORK, CARRY, MOVE],
    memory: { role: 'builder' }
  }
};

export const CreepFactory = {
  create(
    role: CreepRole,
    name: string,
    ctx: BodyBuilderContext
  ): { body: BodyPartConstant[]; memory: CreepMemory } {
    const def = creepRoles[role];
    const body = def.buildBody(ctx);
    const memory: CreepMemory = {
      home: '',role:'',
      ...def.memory,
      ...ctx.source && { sourceId: ctx.source.id },
      homeSpawn: ''
    };

    return { body, memory };
  }
};
