<script>
    /** @type {{ data: import('./$types').PageData }} */
    let { data } = $props();
</script>

<svelte:head>
    <title>Admin - Fiore</title>
</svelte:head>

<div class="admin-container">
    <header class="admin-header">
        <h1>Admin Dashboard</h1>
        <div class="user-info">
            {#if data.user?.image}
                <img src={data.user.image} alt="profile" class="profile-img" />
            {/if}
            <span>{data.user?.name || data.user?.email}</span>
            <form method="POST" action="/admin/logout">
                <button type="submit" class="logout-btn">로그아웃</button>
            </form>
        </div>
    </header>

    <main class="admin-main">
        <section class="admin-section">
            <h2>데이터 관리</h2>
            <div class="admin-cards">
                <a href="/admin/concerts" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    <h3>공연 관리</h3>
                    <p>공연 정보 추가/수정/삭제</p>
                </a>
                <a href="/admin/artists" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <h3>아티스트 관리</h3>
                    <p>아티스트 정보 추가/수정/삭제</p>
                </a>
                <a href="/admin/albums" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></svg>
                    <h3>앨범 관리</h3>
                    <p>앨범 정보 추가/수정/삭제</p>
                </a>
                <a href="/admin/concours" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6" /><path d="M8.5 13.5 7 22l5-2.7 5 2.7-1.5-8.5" /></svg>
                    <h3>콩쿠르 관리</h3>
                    <p>콩쿠르 정보 추가/수정/삭제</p>
                </a>
                <a href="/admin/auditions" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1.5a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3z" /><path d="M19 10.5v1.5a7 7 0 0 1-14 0v-1.5" /><line x1="12" y1="19" x2="12" y2="22.5" /><line x1="8.5" y1="22.5" x2="15.5" y2="22.5" /></svg>
                    <h3>오디션 관리</h3>
                    <p>오디션 정보 추가/수정/삭제</p>
                </a>
                <a href="/admin/notice" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 6.5-3 8.5-3 8.5h18s-3-2-3-8.5" /><path d="M13.7 20.5a2 2 0 0 1-3.4 0" /></svg>
                    <h3>공지사항 관리</h3>
                    <p>공지사항 추가/수정/삭제</p>
                </a>
                <a href="/admin/banners" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="1.5" /><line x1="7.5" y1="4" x2="7.5" y2="20" /><line x1="16.5" y1="4" x2="16.5" y2="20" /><line x1="2.5" y1="9" x2="7.5" y2="9" /><line x1="2.5" y1="15" x2="7.5" y2="15" /><line x1="16.5" y1="9" x2="21.5" y2="9" /><line x1="16.5" y1="15" x2="21.5" y2="15" /></svg>
                    <h3>배너 관리</h3>
                    <p>메인 페이지 배너 항목/순서 관리</p>
                </a>
                <a href="/admin/rentals" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10.5h14V10" /><line x1="10" y1="20.5" x2="10" y2="15" /><line x1="14" y1="20.5" x2="14" y2="15" /></svg>
                    <h3>대관 관리</h3>
                    <p>대관 신청 승인/거절, 대관 계획 등록</p>
                </a>
            </div>
        </section>

        <section class="admin-section">
            <h2>업로드</h2>
            <div class="admin-cards">
                <a href="/admin/upload/images" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12.5" /><path d="m7 8 5-5 5 5" /><path d="M4.5 21h15" /></svg>
                    <h3>이미지 업로드</h3>
                    <p>이미지 파일 업로드</p>
                </a>
                <a href="/admin/gallery" class="admin-card">
                    <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15.5 16 10.5 12 14.5 9 11.5 3 17.5" /></svg>
                    <h3>갤러리 관리</h3>
                    <p>갤러리 이미지 업로드/삭제</p>
                </a>
            </div>
        </section>
    </main>
</div>

<style lang="scss">
    section {
        margin: 1rem 0;
        padding: 1rem;
    }
    .admin-container {
        background: #ffffff;
        color: #222;
    }

    .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid #e0e0e0;

        h1 {
            margin: 0;
            font-size: 1.5rem;
            color: #111;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: #555;
        }

        .profile-img {
            width: 36px;
            height: 36px;
            border-radius: 50%;
        }

        .logout-btn {
            padding: 0.5rem 1rem;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;

            &:hover {
                background-color: #c82333;
            }
        }
    }

    .admin-main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    .admin-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }

    .admin-card {
        display: block;
        padding: 1.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
        background: #fff;

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        h3 {
            margin: 0 0 0.5rem;
            font-size: 1.1rem;
            color: #222;
        }

        p {
            margin: 0;
            font-size: 0.9rem;
            color: #888;
        }
    }

    .card-icon {
        width: 24px;
        height: 24px;
        margin-bottom: 0.75rem;
        color: #9ca3af;
    }
</style>
