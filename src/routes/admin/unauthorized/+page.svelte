<script>
  import Button from '$lib/components/ui/Button.svelte';
  import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
</script>

<svelte:head>
  <title>접근 불가 - Fiore</title>
</svelte:head>

<div class="unauthorized-container">
  <div class="unauthorized-box">
    <h1>접근 권한 없음</h1>
    <StatusMessage kind="error" message="이 이메일은 관리자 페이지에 접근할 수 없습니다. 관리자에게 문의하거나 다른 계정으로 로그인해 주세요." />
    
    <div class="actions">
      <Button href="/">홈으로 돌아가기</Button>
      <form method="POST" action="/admin/logout">
        <Button type="submit" variant="secondary">다른 계정으로 로그인</Button>
      </form>
    </div>
  </div>
</div>

<style lang="scss">
  .unauthorized-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }

  .unauthorized-box {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    text-align: center;
    max-width: 450px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: stretch;

    h1 { margin: 0; font-size: 28px; font-weight: 600; }
  }

  .actions { margin-top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); align-items: center; }
</style>
