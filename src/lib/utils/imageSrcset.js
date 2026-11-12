// 변형 후보(thumb 240w, mid 600w, large 1200w, 원본 width)로 srcset 문자열을 만든다.
// 비어 있는 변형은 빠지고, 원본은 width를 알 때만 넣는다(틀린 w 값은 브라우저를 오도한다).
export function buildSrcset({ thumb, mid, large, src, width }) {
	return [
		[thumb, 240],
		[mid, 600],
		[large, 1200],
		[src, width]
	]
		.filter(([url, w]) => url && w)
		.map(([url, w]) => `${url} ${w}w`)
		.join(', ');
}
