// 상단에 배경 Hero가 깔려 헤더를 투명하게 겹쳐야 하는 경로 (NavSection bg와 일치시킬 것)
const EXACT = ['/', '/concerts', '/artists', '/contents'];

export function hasTopHero(pathname) {
	return EXACT.includes(pathname) || pathname === '/application' || pathname.startsWith('/application/');
}
