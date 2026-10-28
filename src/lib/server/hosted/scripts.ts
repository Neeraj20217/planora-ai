// These scripts execute atomically on the primary. TIME comes from Redis, not workers.
const clock = `local now = tonumber(redis.call('TIME')[1])
local day = math.floor(now / 86400)
local minute = math.floor(now / 60)
local p = ARGV[1]
`;
const session = `local invite = redis.call('GET', KEYS[1])
if not invite or redis.call('GET', p .. 'invite:' .. invite) ~= 'active' then return 'SESSION' end
`;
export const REDEEM =
  clock +
  `
local ip = p .. 'login:' .. ARGV[2] .. ':' .. math.floor(now / 900)
local global = p .. 'login-global:' .. minute
local n = redis.call('INCR', ip); redis.call('EXPIRE', ip, 901)
local g = redis.call('INCR', global); redis.call('EXPIRE', global, 61)
if n > 5 or g > 100 then return 'LIMIT' end
if redis.call('GET', p .. 'invite:' .. ARGV[3]) ~= 'active' then return 'SESSION' end
if redis.call('EXISTS', p .. 'used:' .. ARGV[3]) == 1 then return 'SESSION' end
local inviteTTL = redis.call('TTL', p .. 'invite:' .. ARGV[3])
local ttl = math.min(28800, inviteTTL)
if ttl <= 0 then return 'SESSION' end
redis.call('SET', p .. 'used:' .. ARGV[3], '1', 'EX', inviteTTL)
redis.call('SET', KEYS[1], ARGV[3], 'EX', ttl)
return ttl
`;
export const ADMIT =
  clock +
  session +
  `
if redis.call('GET', p .. 'generation-state') ~= 'enabled' then return 'DISABLED' end
local ip = p .. 'ip:' .. ARGV[2] .. ':' .. minute
local count = redis.call('INCR', ip); redis.call('EXPIRE', ip, 61)
if count > 3 then return 'LIMIT' end
local daily = p .. 'invite-day:' .. invite .. ':' .. day
if tonumber(redis.call('GET', daily) or '0') >= 5 then return 'LIMIT' end
if tonumber(redis.call('GET', p .. 'attempt-day:' .. day) or '0') >= 40 then return 'LIMIT' end
local leases = p .. 'leases'
redis.call('ZREMRANGEBYSCORE', leases, '-inf', now)
if redis.call('ZCARD', leases) >= 2 then return 'LIMIT' end
redis.call('INCR', daily); redis.call('EXPIRE', daily, 172800)
redis.call('ZADD', leases, now + 90, ARGV[3]); redis.call('EXPIRE', leases, 180)
return 'OK'
`;
export const ATTEMPT =
  clock +
  session +
  `
if redis.call('GET', p .. 'generation-state') ~= 'enabled' then return 'DISABLED' end
local score = redis.call('ZSCORE', p .. 'leases', ARGV[2])
if not score or tonumber(score) <= now then return 'LEASE' end
local key = p .. 'attempt-day:' .. day
if tonumber(redis.call('GET', key) or '0') >= 40 then return 'LIMIT' end
redis.call('INCR', key); redis.call('EXPIRE', key, 172800)
return 'OK'
`;
// Each lease is an unguessable ownership token, never a shared boolean/slot number.
export const RELEASE = `return redis.call('ZREM', KEYS[1], ARGV[1])`;
export const SESSION = clock + session + `return 'OK'`;
