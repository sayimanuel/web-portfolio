const router    = require('express').Router();
const Analytics = require('../models/Analytics');
const auth      = require('../middleware/auth');

// POST /api/analytics/track — public
router.post('/track', async (req, res) => {
  try {
    const { event, page, projectId, referrer, sessionId, isNew } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    await Analytics.create({ event, page: page || '', projectId: projectId || '', referrer: referrer || '', sessionId: sessionId || '', isNew: !!isNew });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET /api/analytics/summary — admin
router.get('/summary', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sincePrev = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    const [totalViews, prevViews, projectViews, contactClicks, allSessions, returnCount] = await Promise.all([
      Analytics.countDocuments({ event: 'pageview', createdAt: { $gte: since } }),
      Analytics.countDocuments({ event: 'pageview', createdAt: { $gte: sincePrev, $lt: since } }),
      Analytics.countDocuments({ event: 'project_view', createdAt: { $gte: since } }),
      Analytics.countDocuments({ event: 'contact_click', createdAt: { $gte: since } }),
      Analytics.distinct('sessionId', { createdAt: { $gte: since } }),
      Analytics.countDocuments({ isNew: false, event: 'pageview', createdAt: { $gte: since } }),
    ]);

    const uniqueSessions = allSessions.length;
    const trend = prevViews > 0 ? Math.round((totalViews - prevViews) / prevViews * 100) : null;
    const convRate = uniqueSessions > 0 ? Math.round(contactClicks / uniqueSessions * 100) : 0;

    res.json({ totalViews, uniqueSessions, projectViews, contactClicks, trend, convRate, newVisitors: uniqueSessions - returnCount, returnCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/funnel — admin
router.get('/funnel', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [home, projects, cases, contact] = await Promise.all([
      Analytics.countDocuments({ event: 'pageview', page: { $in: ['/', '/index.html', ''] }, createdAt: { $gte: since } }),
      Analytics.countDocuments({ event: 'pageview', page: '/projects.html', createdAt: { $gte: since } }),
      Analytics.countDocuments({ event: 'project_view', createdAt: { $gte: since } }),
      Analytics.countDocuments({ event: 'contact_click', createdAt: { $gte: since } }),
    ]);

    res.json({ home, projects, cases, contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/projects — admin
router.get('/projects', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sincePrev = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    const [views, prevViews, allTime] = await Promise.all([
      Analytics.aggregate([
        { $match: { event: 'project_view', createdAt: { $gte: since } } },
        { $group: { _id: '$projectId', views: { $sum: 1 } } },
        { $sort: { views: -1 } }, { $limit: 10 }
      ]),
      Analytics.aggregate([
        { $match: { event: 'project_view', createdAt: { $gte: sincePrev, $lt: since } } },
        { $group: { _id: '$projectId', views: { $sum: 1 } } }
      ]),
      Analytics.aggregate([
        { $match: { event: 'project_view' } },
        { $group: { _id: '$projectId', total: { $sum: 1 } } }
      ]),
    ]);

    const prevMap = {}, allMap = {};
    prevViews.forEach(p => prevMap[p._id] = p.views);
    allTime.forEach(p => allMap[p._id] = p.total);

    const Project = require('../models/Project');
    const ids = views.map(v => v._id).filter(Boolean);
    const projects = await Project.find({ _id: { $in: ids } }, 'title').lean();
    const titleMap = {};
    projects.forEach(p => titleMap[String(p._id)] = p.title);

    const result = views.map((v, i) => {
      const prev = prevMap[v._id] || 0;
      const trend = prev > 0 ? Math.round((v.views - prev) / prev * 100) : null;
      const score = Math.round(v.views * 10 + (trend !== null ? Math.max(0, trend) : 5));
      return { projectId: v._id, title: titleMap[v._id] || 'Unknown', views: v.views, allTime: allMap[v._id] || v.views, trend, score, rank: i + 1 };
    });

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/sources — admin
router.get('/sources', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const refs = await Analytics.aggregate([
      { $match: { event: 'pageview', createdAt: { $gte: since } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
    ]);

    const sources = {};
    refs.forEach(r => {
      const ref = r._id || '';
      let src = 'Direct';
      if (/google|bing|yahoo|duckduckgo/i.test(ref)) src = 'Search';
      else if (/linkedin/i.test(ref)) src = 'LinkedIn';
      else if (/instagram/i.test(ref)) src = 'Instagram';
      else if (/facebook|fb\.com/i.test(ref)) src = 'Facebook';
      else if (/twitter|t\.co/i.test(ref)) src = 'Twitter/X';
      else if (ref) src = 'Other';
      sources[src] = (sources[src] || 0) + r.count;
    });

    const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
    const result = Object.entries(sources)
      .map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/activity — admin (live feed)
router.get('/activity', auth, async (req, res) => {
  try {
    const events = await Analytics.find({}).sort({ createdAt: -1 }).limit(15).lean();
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/views/:projectId — public (for view counter on cards)
router.get('/views/:projectId', async (req, res) => {
  try {
    const count = await Analytics.countDocuments({ event: 'project_view', projectId: req.params.projectId });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/popular — public (top 3 project IDs this week)
router.get('/popular', async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const top = await Analytics.aggregate([
      { $match: { event: 'project_view', createdAt: { $gte: since } } },
      { $group: { _id: '$projectId', views: { $sum: 1 } } },
      { $sort: { views: -1 } }, { $limit: 3 }
    ]);
    res.json(top.map(t => t._id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/sparkline?days=7 — admin (daily view counts)
router.get('/sparkline', auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - i);
      const end   = new Date(start); end.setDate(end.getDate() + 1);
      const count = await Analytics.countDocuments({ event: 'pageview', createdAt: { $gte: start, $lt: end } });
      const label = start.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      result.push({ label, count });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
