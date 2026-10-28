import { createRequire } from "node:module";
// Execute the actual production Lua, not a JS rewrite of admission decisions.
// This Redis primitive model is offline; actual Upstash deployment checks remain required.
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = createRequire(
  import.meta.url,
)("fengari");

export function luaRedis() {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  function run(source: string): unknown {
    if (lauxlib.luaL_dostring(L, to_luastring(source)) !== lua.LUA_OK) {
      const error = to_jsstring(lua.lua_tostring(L, -1));
      lua.lua_settop(L, 0);
      throw new Error(error);
    }
    const type = lua.lua_type(L, -1);
    const result =
      type === lua.LUA_TNUMBER
        ? lua.lua_tonumber(L, -1)
        : type === lua.LUA_TSTRING
          ? to_jsstring(lua.lua_tostring(L, -1))
          : null;
    lua.lua_settop(L, 0);
    return result;
  }
  run(`
now = 1793000000
local data = {}; local expires = {}
redis = {}
function redis.call(cmd, key, ...)
  local a = {...}
  if key and expires[key] and expires[key] <= now then data[key] = nil; expires[key] = nil end
  if cmd == 'TIME' then return {tostring(now), '0'} end
  if cmd == 'GET' then return data[key] or false end
  if cmd == 'SET' then data[key] = tostring(a[1]); expires[key] = nil; if a[2] == 'EX' then expires[key] = now + tonumber(a[3]) end; return 'OK' end
  if cmd == 'EXISTS' then return data[key] and 1 or 0 end
  if cmd == 'DEL' then local found = data[key] and 1 or 0; data[key] = nil; expires[key] = nil; return found end
  if cmd == 'INCR' then data[key] = tostring(tonumber(data[key] or '0') + 1); return tonumber(data[key]) end
  if cmd == 'EXPIRE' then if data[key] then expires[key] = now + tonumber(a[1]); return 1 end; return 0 end
  if cmd == 'TTL' then if not data[key] then return -2 end; if not expires[key] then return -1 end; return expires[key] - now end
  if cmd == 'ZADD' then data[key] = data[key] or {}; data[key][a[2]] = tonumber(a[1]); return 1 end
  if cmd == 'ZREM' then if data[key] and data[key][a[1]] then data[key][a[1]] = nil; return 1 end; return 0 end
  if cmd == 'ZSCORE' then return data[key] and data[key][a[1]] or false end
  if cmd == 'ZCARD' then local n = 0; for _ in pairs(data[key] or {}) do n = n + 1 end; return n end
  if cmd == 'ZREMRANGEBYSCORE' then for k,v in pairs(data[key] or {}) do if v <= tonumber(a[2]) then data[key][k] = nil end end; return 0 end
  error('Unsupported Redis primitive ' .. cmd)
end
`);
  function global(name: string, values: (string | number)[]) {
    lua.lua_newtable(L);
    values.forEach((value, i) => {
      lua.lua_pushstring(L, to_luastring(String(value)));
      lua.lua_rawseti(L, -2, i + 1);
    });
    lua.lua_setglobal(L, to_luastring(name));
  }
  return {
    run,
    advance(seconds: number) {
      run(`now = now + ${seconds}`);
    },
    async command(args: (string | number)[]) {
      if (args[0] === "EVAL") {
        const count = Number(args[2]);
        global("KEYS", args.slice(3, 3 + count));
        global("ARGV", args.slice(3 + count));
        return run(String(args[1]));
      }
      global("ARGV", args);
      return run("return redis.call(table.unpack(ARGV))");
    },
  };
}
