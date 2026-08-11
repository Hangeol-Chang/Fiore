import { marked } from 'marked';

/**
 * marked는 연속된 빈 줄이 몇 개든 문단 구분 1번으로 뭉갠다(리스트 등 블록 구조는
 * 유지하되, 첫 번째 빈 줄만 문단 경계로 쓰고 나머지는 무시). 2개를 초과하는
 * 연속 개행은 앞뒤로 빈 줄을 낀 <br> HTML 블록으로 바꿔, 문단/리스트 파싱은
 * 그대로 두면서 초과분만큼 실제 줄바꿈을 추가로 삽입한다.
 */
function preserveBlankLines(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n{2,}/g, (match) => {
    const extra = match.length - 2;
    if (extra <= 0) return match;
    const breaks = Array(extra).fill('<br>').join('\n\n');
    return '\n\n' + breaks + '\n\n';
  });
}

export function renderMarkdown(content) {
  return marked.parse(preserveBlankLines(content || ''), { breaks: true });
}
