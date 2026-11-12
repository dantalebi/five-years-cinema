// Discover: the shared catalog. Ways in, movements, filters that stack, hiding watched and watchlist films, sorting,
// paging, search, a film's page, adding to the watchlist; Settings as a gear (Playwright, test/server.mjs on :8790).
const {chromium} = require('playwright');
const path = require('path');
const B = 'http://localhost:8790', OUT = process.env.OUT || '/tmp';
let fails = 0; const ok = (c, what, x) => { console.log((c ? 'ok   ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); if (!c) fails++; };

// a small catalog in the real format
const groups = [
  {id: 'french-new-wave', name: 'French New Wave', kind: 'movement', from: 1958, to: 1968, desc: 'Young critics from Cahiers du cinéma take to the streets.'},
  {id: 'film-noir', name: 'Film Noir', kind: 'movement', from: 1940, to: 1959, desc: 'Hardboiled crime in postwar American cinema.'},
  {id: 'slow-cinema', name: 'Slow Cinema', kind: 'movement', from: 1975, to: 2026, desc: 'Long takes and sparse narrative.'},
  {id: 'classical-hollywood', name: 'Classical Hollywood', kind: 'period', from: 1930, to: 1960, desc: 'The studio system at its height.'},
];
const lenses = [
  {id: 'essentials', name: 'Essentials', door: 'New to film?', desc: 'Widely seen, widely loved.'},
  {id: 'canon', name: 'The Canon', door: 'The greatest films ever made', desc: 'Films ranked in the polls.'},
  {id: 'contemplative', name: 'Contemplative Cinema', door: 'Searching for meaning', desc: 'Slow, spiritual and searching films.'},
  {id: 'avant-garde', name: 'Avant-Garde & Experimental', door: 'Beyond narrative', desc: 'Film as poetry.'},
];
const dirs = ['Jean-Luc Godard', 'François Truffaut', 'Andrei Tarkovsky', 'Maya Deren', 'Billy Wilder', 'Michael Mann', 'Someone Else'];
const countries = ['FR', 'SU', 'US', 'IT'];
const L = k => 1 << lenses.findIndex(l => l.id === k);
// [tmdb, slug, title, year, runtime, poster, dirs, countries, genres, groups, lenses, quality, reach, votes, canon, original, lang]
const films = [
  [101, 'breathless', 'Breathless', 1960, 90, '/br.jpg', [0], [0], [80, 18], [0], L('essentials') | L('canon'), 92, 90, 9000, [33, 25, 13, 0, 40], 'À bout de souffle', 'fr'],
  [102, 'the-400-blows', 'The 400 Blows', 1959, 99, '/fb.jpg', [1], [0], [18], [0], L('canon'), 90, 88, 8000, [57, 33, 20, 0, 0], 'Les Quatre Cents Coups', 'fr'],
  [103, 'mirror', 'Mirror', 1975, 107, '/mi.jpg', [2], [1], [18], [2], L('canon') | L('contemplative'), 97, 80, 6000, [19, 9, 22, 0, 0], 'Зеркало', 'ru'],
  [104, 'stalker', 'Stalker', 1979, 162, '/st.jpg', [2], [1], [878, 18], [2], L('canon') | L('contemplative'), 96, 85, 7000, [29, 14, 18, 0, 0], 'Сталкер', 'ru'],
  [105, 'meshes-of-the-afternoon', 'Meshes of the Afternoon', 1943, 14, '', [3], [2], [], [], L('avant-garde'), 88, 60, 900, [16, 0, 70, 0, 0], '', 'en'],
  [106, 'double-indemnity', 'Double Indemnity', 1944, 107, '/di.jpg', [4], [2], [80, 53], [1, 3], L('essentials') | L('canon'), 89, 85, 5000, [0, 0, 60, 0, 0], '', 'en'],
  [107, 'heat-1995', 'Heat', 1995, 170, '/he.jpg', [5], [2], [28, 80], [], L('essentials'), 85, 99, 9900, [0, 0, 0, 0, 0], '', 'en'],
];
for (let i = 0; i < 140; i++) films.push([2000 + i, 'filler-' + i, 'Filler Film ' + i, 1965 + (i % 50), 80 + (i % 60), '/f' + i + '.jpg', [6], [3], [18], [], 0, 40 + (i % 40), 20 + (i % 70), 100 + i, [0, 0, 0, 0, 0], '', 'it']);
const CAT = {v: 1, built: '2026-11-12', fields: ['tmdb', 'slug', 'title', 'year', 'runtime', 'poster', 'dirs', 'countries', 'genres', 'groups', 'lenses', 'quality', 'reach', 'votes', 'canon', 'original', 'lang'],
  canon: ['ss_critics', 'ss_directors', 'tspdt_1000', 'tspdt_21c', 'criterion_closet'], dirs, countries, genres: {18: 'Drama', 28: 'Action', 53: 'Thriller', 80: 'Crime', 878: 'Science Fiction'}, groups, lenses, films};

(async () => {
  const b = await chromium.launch(), errs = [];
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p = await c.newPage();
  await c.route(/image\.tmdb\.org|fonts\.g/, r => r.fulfill({status: 200, body: ''}));
  let catalogStatus = 200, catalogHits = 0;
  await c.route('**/catalog/catalog.json', r => { catalogHits++; return catalogStatus === 200 ? r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(CAT)}) : r.fulfill({status: 404, body: 'nope'}); });
  await c.route('**/api/tmdb/movie/**', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 101, overview: 'A small-time thief steals a car and impulsively murders a policeman.', tagline: 'The film that changed everything.', backdrop_path: '/bd101.jpg', credits: {cast: [{name: 'Jean-Paul Belmondo', order: 0}, {name: 'Jean Seberg', order: 1}]}})}));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('form[data-auth]');
  await p.click('[data-amode="up"]'); await p.fill('input[name=u]', 'dora'); await p.fill('input[name=n]', 'Dora'); await p.fill('input[name=p]', 'pass for dora');
  await p.click('form[data-auth] button[type=submit]'); await p.waitForSelector('[data-knext]', {timeout: 15000}); await p.check('[data-kok]'); await p.click('[data-knext]'); await p.waitForSelector('[data-ostart="sample"]', {timeout: 15000});
  await p.click('[data-ostart="sample"]'); await p.waitForSelector('.fx-tabbar');
  // she has seen Mirror (logged with its TMDB id) and has Stalker on her watchlist
  await p.evaluate(() => {
    Store.set('log:m1', 't:Mirror (1975)'); Store.set('v:log:m1', '2026-03-04'); Store.set('md:log:m1', JSON.stringify({tm: 103, t: 'Mirror', y: 1975}));
    Store.set('wl:tm104', JSON.stringify({t: 'Stalker', y: 1979, tm: 104, p: '', u: '', at: Date.now()}));
  });

  // the bar: Discover after Diary, Settings behind the gear
  const bar = await p.$$eval('.fx-tabbar button', bs => bs.map(x => x.dataset.nav || (x.hasAttribute('data-qlog') ? '+' : '')));
  ok(bar.join(',') === 'friends,week,+,diary,discover', 'the bar: Activity, This Week, +, Diary, Discover', bar);
  ok(await p.$('.av-top [data-ac-menu]') !== null, 'Settings is in the account menu at the top');
  await p.click('[data-ac-menu]'); await p.click('.av-menu a[href="/settings"]'); await p.waitForSelector('.fx-h1');
  ok(/Settings/.test(await p.$eval('.fx-h1', e => e.textContent)), 'the gear opens Settings');
  ok(await p.$('.av-me.on') !== null, 'the corner shows Settings is open');

  // the home page
  await p.click('[data-nav="discover"]'); await p.waitForSelector('.dx-doors', {timeout: 8000});
  ok(catalogHits === 1, 'the catalog loads once, when Discover first opens', catalogHits);
  const home = await p.$eval('.fx-app', e => e.innerText.replace(/\s+/g, ' '));
  ok(/147 films, from the silent era to now/.test(home), 'the lede counts the catalog', home.slice(0, 160));
  ok(/New to film\?/i.test(home) && /Essentials/.test(home) && /Searching for meaning/i.test(home), 'ways in for different viewers');
  ok(/Postwar Cinema/.test(home) && /The New Waves/.test(home) && home.indexOf('Film Noir') < home.indexOf('French New Wave'), 'movements in the order they began, under their eras');
  ok(/Eras and Golden Ages/i.test(home) && /Classical Hollywood/.test(home), 'eras kept apart from movements');
  ok(/National Cinemas/i.test(home) && /Soviet Union/.test(home) && /United States/.test(home), 'national cinemas, with names for countries that no longer exist');
  ok(/1940s/.test(home) && /Science Fiction/.test(home), 'decades and genres');
  ok(/not endorsed or certified by TMDB/.test(home), 'TMDB attribution');
  await p.screenshot({path: path.join(OUT, 'dx-home.png'), fullPage: false});

  // a movement
  await p.click('.dx-list a[href="/discover/movement/french-new-wave"]'); await p.waitForSelector('.dx-grid');
  ok(p.url().endsWith('/discover/movement/french-new-wave'), 'the movement has its own address', p.url());
  ok(await p.$eval('.dx-h1', e => e.textContent) === 'French New Wave', 'the movement’s page');
  ok(/Movement, 1958–1968/.test(await p.$eval('.dx-head .fx-eye', e => e.textContent)), 'its years');
  let titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.length === 2 && titles.includes('Breathless'), 'its films', titles);
  await p.selectOption('[data-dx-sort]', 'old');
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles[0] === 'The 400 Blows', 'sorted oldest first', titles);
  ok(p.url().endsWith('/discover/movement/french-new-wave?sort=old'), 'the sort goes in the address', p.url());
  // filters stack
  await p.click('[data-dx-filters]'); await p.waitForSelector('.dx-panel');
  const gopts = await p.$$eval('[data-dx-f="genre"] option', os => os.map(o => o.textContent));
  ok(gopts.some(o => o === 'Crime (1)') && !gopts.some(o => /Action/.test(o)), 'genre choices show what’s left, with counts', gopts);
  await p.selectOption('[data-dx-f="genre"]', '80');
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.join() === 'Breathless', 'French New Wave + Crime', titles);
  ok(p.url().endsWith('?genre=crime&sort=old'), 'so do the filters', p.url());
  await p.reload(); await p.waitForSelector('.dx-grid');
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.join() === 'Breathless' && await p.$eval('[data-dx-sort]', e => e.value) === 'old', 'a reload shows the same list', titles);
  await p.click('[data-dx-filters]'); await p.waitForSelector('.dx-panel');
  ok(/1 film\b/.test(await p.$eval('.dx-count', e => e.textContent)), 'the count follows');
  ok((await p.$$('.dx-active .fx-chip')).length === 2, 'each filter has a chip');
  await p.click('[data-dx-rm="group"]');
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.includes('Heat') && titles.includes('Double Indemnity') && !titles.includes('The 400 Blows'), 'removing one filter keeps the others', titles);
  await p.screenshot({path: path.join(OUT, 'dx-filters.png'), fullPage: false});

  // everything: hide what she's seen, then what's already on her watchlist
  await p.click('.dx-head a[href="/discover"]'); await p.click('a[href="/discover/all"]'); await p.waitForSelector('.dx-grid');
  ok(await p.$('a.dx-cell[href="/film/mirror"] .dx-mseen') !== null && await p.$('a.dx-cell[href="/film/stalker"] .dx-mwl') !== null, 'marks: watched and on your watchlist');
  ok(/147 films/.test(await p.$eval('.dx-count', e => e.textContent)), 'all of them');
  ok((await p.$$('.dx-grid li')).length === 60, 'sixty at a time');
  await p.click('[data-dx-more]');
  ok((await p.$$('.dx-grid li')).length === 147, 'Show more shows the rest');
  await p.click('[data-dx-hide="s"]');
  let cnt = await p.$eval('.dx-count', e => e.textContent.replace(/\s+/g, ' '));
  ok(/146 films/.test(cnt) && /1 watched hidden/.test(cnt) && !(await p.$('a.dx-cell[href="/film/mirror"]')), 'Hide watched', cnt);
  await p.click('[data-dx-hide="w"]');
  cnt = await p.$eval('.dx-count', e => e.textContent.replace(/\s+/g, ' '));
  ok(/145 films/.test(cnt) && /1 watched and 1 on your watchlist hidden/.test(cnt) && !(await p.$('a.dx-cell[href="/film/stalker"]')), 'Hide watchlist too', cnt);
  ok(await p.evaluate(() => Store.data['cfg:dxh']) === 'sw', 'kept as a setting (so it syncs)');
  // search: narrows as you type, and the box keeps focus
  await p.click('[data-dx-q]'); await p.keyboard.type('tarkov'); await p.waitForTimeout(400);
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.length === 0 && /Nothing matches/.test(await p.$eval('.dx-dyn', e => e.innerText)), 'Tarkovsky: both his films are hidden', titles);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-dx-q]')), 'the search box keeps focus');
  await p.click('[data-dx-hide="s"]'); await p.click('[data-dx-hide="w"]');
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.length === 2 && titles.includes('Mirror') && titles.includes('Stalker'), 'searching by director', titles);
  await p.fill('[data-dx-q]', 'bout de'); await p.waitForTimeout(400);
  titles = await p.$$eval('.dx-grid .dx-ct', es => es.map(e => e.textContent));
  ok(titles.join() === 'Breathless', 'searching by original title', titles);

  // a film's page
  await p.click('a.dx-cell[href="/film/breathless"]'); await p.waitForSelector('.dx-ft');
  ok(p.url().endsWith('/film/breathless'), 'the film has its own address', p.url());
  await p.waitForSelector('.dx-ov', {timeout: 5000});
  const fp = await p.$eval('.fx-app', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Breathless/.test(fp) && /À bout de souffle/.test(fp) && /Directed by Jean-Luc Godard/.test(fp), 'title, original title, director', fp.slice(0, 200));
  ok(/1h 30m/.test(fp) && /France/.test(fp) && /Crime/.test(fp), 'length, country, genres');
  ok(/A small-time thief/.test(fp) && /Starring Jean-Paul Belmondo, Jean Seberg/.test(fp), 'the synopsis and cast from TMDB');
  ok(/Sight and Sound 2022/.test(fp) && /#33/.test(fp) && /#13/.test(fp), 'where it stands in the polls');
  ok(/Part of/i.test(fp) && /French New Wave/.test(fp) && /The Canon/.test(fp), 'its movement and collections');
  ok(await p.$('.dx-bd img') !== null, 'a backdrop');
  ok(await p.$eval('.dx-acts a', a => a.href) === 'https://letterboxd.com/film/breathless/', 'Letterboxd link');
  await p.screenshot({path: path.join(OUT, 'dx-film.png'), fullPage: false});
  await p.click('[data-fp-wl]'); await p.waitForTimeout(300);
  ok(!!(await p.evaluate(() => Store.data['wl:tm101'])), 'Add to watchlist: on her watchlist');
  ok(/On your watchlist/.test(await p.$eval('[data-fp-wl]', e => e.textContent)), 'the button says so');
  ok(!Object.keys(await p.evaluate(() => Store.data)).some(k => /^(log|add|free):/.test(k) && k !== 'log:m1'), 'nothing goes into her plan or diary');
  await p.goBack(); await p.waitForSelector('.dx-grid');
  ok(await p.$eval('[data-dx-q]', e => e.value) === 'bout de' && /\/discover\/all\?q=bout/.test(p.url()), 'the phone’s Back returns to the same list', p.url());
  // the director
  await p.fill('[data-dx-q]', 'tarkovsky'); await p.waitForTimeout(400);
  await p.click('a.dx-cell[href="/film/mirror"]'); await p.waitForSelector('.dx-ft');
  ok(/March 4, 2026/.test(await p.$eval('.fp-you', e => e.textContent)), 'a film she’s seen shows her diary entry');
  await p.click('.fp-ent'); await p.waitForSelector('.fx-sheet', {timeout: 5000});
  ok(true, 'the entry opens from the film’s page');
  await p.goBack(); await p.waitForTimeout(400);
  ok(!(await p.$('.fx-sheet:not([hidden])')) && /\/film\/mirror$/.test(p.url()), 'Back closes the entry and stays on the film', p.url());
  ok(/More by Andrei Tarkovsky/i.test(await p.$eval('.fx-app', e => e.innerText)) && await p.$('.dx-row a[href="/film/stalker"]') !== null, 'more by the same director');
  await p.click('.dx-by a[href="/director/andrei-tarkovsky"]'); await p.waitForSelector('.dx-grid');
  ok(p.url().endsWith('/director/andrei-tarkovsky'), 'the director has an address too');
  ok(await p.$eval('.dx-h1', e => e.textContent) === 'Andrei Tarkovsky', 'a director’s page');
  // Log opens the log sheet with the film
  await p.click('.dx-grid a.dx-cell[href="/film/stalker"]'); await p.waitForSelector('[data-fp-log]');
  await p.click('[data-fp-log]'); await p.waitForSelector('.fx-sheet', {timeout: 5000});
  ok(/Stalker/.test(await p.$eval('.fx-sheet', e => e.innerText)), 'Log opens the log sheet for this film');

  // wide screen
  await p.setViewportSize({width: 1280, height: 900}); await p.reload(); await p.waitForSelector('.fx-tabbar');
  await p.click('[data-nav="discover"]'); await p.waitForSelector('.dx-doors');
  await p.screenshot({path: path.join(OUT, 'dx-desk.png'), fullPage: false});
  await p.click('a[href="/discover/all"]'); await p.waitForSelector('.dx-grid'); await p.click('[data-dx-filters]');
  await p.screenshot({path: path.join(OUT, 'dx-desk-all.png'), fullPage: false});
  const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!over, 'no sideways scrolling');

  // before the catalog exists
  const c2 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'}), p2 = await c2.newPage();
  await c2.route('**/catalog/catalog.json', r => r.fulfill({status: 404, body: ''}));
  await p2.goto(B + '/'); await p2.waitForSelector('form[data-auth]');
  await p2.fill('input[name=u]', 'dora'); await p2.fill('input[name=p]', 'pass for dora'); await p2.click('form[data-auth] button[type=submit]');
  await p2.waitForSelector('.fx-tabbar', {timeout: 15000}); await p2.click('[data-nav="discover"]'); await p2.waitForTimeout(800);
  ok(/The catalog is on its way/i.test(await p2.$eval('.fx-app', e => e.innerText)), 'no catalog yet: says it’s on its way');
  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
