const GeoCache = require('../models/GeoCache');

// Extract real IP from request (works on Netlify Functions)
function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

// Lookup geolocation — DB cache first, ip-api.com as fallback
// ip-api.com free: 1000 req/day, no HTTPS on free tier (use HTTP)
async function getGeo(req) {
  const ip = getIp(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127')) {
    return { country: 'Local', city: '', region: '', isp: '', lat: null, lon: null };
  }

  const ipHash = GeoCache.hashIp(ip);

  // Return cached result if exists
  const cached = await GeoCache.findOne({ ipHash }).lean();
  if (cached) return { country: cached.country, city: cached.city, region: cached.region, isp: cached.isp, lat: cached.lat, lon: cached.lon };

  // Call ip-api.com (free tier — HTTP only, 1000 req/day)
  try {
    const res  = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,lat,lon`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();

    const geo = data.status === 'success'
      ? { country: data.country || '', city: data.city || '', region: data.regionName || '', isp: data.isp || '', lat: data.lat || null, lon: data.lon || null }
      : { country: '', city: '', region: '', isp: '', lat: null, lon: null };

    // Save to cache (fire-and-forget, don't block response)
    GeoCache.findOneAndUpdate({ ipHash }, { ...geo, ipHash }, { upsert: true, new: true }).catch(() => {});

    return geo;
  } catch {
    // API unreachable or limit hit — return empty, still save blank cache to avoid retry storm
    GeoCache.findOneAndUpdate({ ipHash }, { country: '', city: '', region: '', isp: '', lat: null, lon: null, ipHash }, { upsert: true }).catch(() => {});
    return { country: '', city: '', region: '', isp: '', lat: null, lon: null };
  }
}

module.exports = { getGeo, getIp };
