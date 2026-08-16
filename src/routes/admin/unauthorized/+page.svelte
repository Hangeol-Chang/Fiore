<svelte:head>
  <title>접근 불가 - Studio Pianolife</title>
</svelte:head>

<div class="unauthorized-container">
  <div class="unauthorized-box">
    <h1>접근 권한 없음</h1>
    <p>이 이메일은 관리자 페이지에 접근할 수 없습니다.</p>
    <p>관리자에게 문의하세요.</p>
    
    <div class="actions">
      <a href="/" class="btn btn-primary">홈으로 돌아가기</a>
      <form method="POST" action="/admin/logout">
        <button type="submit" class="btn btn-secondary">다른 계정으로 로그인</button>
      </form>
    </div>
  </div>
</div>

<style lang="scss">
  .unauthorized-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
    color: #222;
  }

  .unauthorized-box {
    padding: 3rem;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    text-align: center;
    max-width: 450px;
    width: 90%;

    h1 {
      margin: 0 0 1rem;
      font-size: 1.75rem;
      color: #dc3545;
    }

    p {
      color: #666;
      margin-bottom: 0.5rem;
    }
  }

  .actions {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  .btn-primary {
    background-color: #2563eb;
    color: white;
  }

  .btn-secondary {
    background-color: transparent;
    color: #666;
    border: 1px solid #ccc;
  }
</style>
