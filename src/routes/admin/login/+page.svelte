<script>
  import { signIn } from "@auth/sveltekit/client";
  import Button from '$lib/components/ui/Button.svelte';
  import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
</script>

<svelte:head>
  <title>Admin Login - Fiore</title>
</svelte:head>

<div class="login-container">
  <div class="login-box">
    <h1>Admin Login</h1>
    <p>관리자 페이지에 접근하려면 Google 계정으로 로그인하세요.</p>
    <StatusMessage kind="warning" message="허용된 이메일만 접근할 수 있습니다. 허용되지 않은 계정이면 다른 계정으로 로그인해 주세요." />
    
    <Button class="google-btn" onclick={() => signIn("google", { callbackUrl: "/admin" })}>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Google로 로그인
    </Button>
  </div>
</div>

<style lang="scss">
  .login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }

  .login-box {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    text-align: center;
    max-width: 400px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: stretch;

    h1 { margin: 0; font-size: 28px; font-weight: 600; }
    p { margin: 0; }
  }

  .login-box :global(.google-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
  }
</style>
