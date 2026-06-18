type SeedEnv = Record<string, string | undefined>;

function required(env: SeedEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`缺少 ${name} 环境变量，拒绝使用硬编码演示密码`);
  return value;
}

export function getSeedPasswords(env: SeedEnv) {
  return {
    adminPassword: required(env, "SEED_ADMIN_PASSWORD"),
    demoPassword: required(env, "SEED_DEMO_PASSWORD"),
  };
}
