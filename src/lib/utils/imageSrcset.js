// 리사이즈 변형(thumb 240w, mid 600w, large 1200w)으로 srcset 문자열을 만든다.
// 원본은 후보에 넣지 않는다. 비어 있는 변형은 빠진다.
export function buildSrcset({ thumb, mid, large }) {
	return [
		[thumb, 240],
		[mid, 600],
		[large, 1200]
	]
		.filter(([url, w]) => url && w)
		.map(([url, w]) => `${url} ${w}w`)
		.join(', ');
}
