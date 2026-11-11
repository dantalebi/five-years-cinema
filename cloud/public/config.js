// The site's name and language.
const FY_CONFIG = {siteName: 'TVC15', siteNameFa: 'TVC15', lang: 'en'};
// the site moved: the old address sends you to the same page at the new one
if (location.hostname === 'film-diary-cdo.pages.dev') location.replace('https://tvc15.pages.dev' + location.pathname + location.search + location.hash);
