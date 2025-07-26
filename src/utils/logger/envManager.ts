// envManager.ts
type Environment = 'development' | 'production' | 'test';

const ENVIRONMENTS: Environment[] = ['development', 'production', 'test'];

export const envManager = {
    get(): Environment {
        const env = Memory.env as Environment;
        return ENVIRONMENTS.includes(env) ? env : 'production';
    },

    set(env: Environment): void {
        if (!ENVIRONMENTS.includes(env)) {
            console.log(`[envManager] Invalid environment: "${env}"`);
            return;
        }
        Memory.env = env;
        console.log(`[envManager] Environment set to "${env}"`);
    },

    cycle(): Environment {
        const current = this.get();
        const currentIndex = ENVIRONMENTS.indexOf(current);
        const next = ENVIRONMENTS[(currentIndex + 1) % ENVIRONMENTS.length];
        Memory.env = next;
        console.log(`[envManager] Environment cycled to "${next}"`);
        return next;
    },

    list(): void {
        console.log(`[envManager] Available environments: ${ENVIRONMENTS.join(', ')}`);
    }
};
