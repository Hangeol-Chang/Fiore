<script>
  let {
    imageUrl,
    initialFocusY = 50,
    onSave,
    onClose,
  } = $props();

  const CONTAINER_WIDTH = 420;

  let focusY = $state(initialFocusY ?? 50);
  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let ratioMode = $state('16:9'); // '16:9' | '18:9'
  let imgEl = $state(null);
  let dragging = $state(false);

  const displayHeight = $derived(
    naturalWidth && naturalHeight ? CONTAINER_WIDTH / (naturalWidth / naturalHeight) : 0
  );

  const cropRatio = $derived(ratioMode === '16:9' ? 16 / 9 : 18 / 9);
  const cropHeight = $derived(Math.min(displayHeight, CONTAINER_WIDTH / cropRatio));

  const centerPx = $derived(displayHeight * (focusY / 100));
  const cropTop = $derived(
    Math.max(0, Math.min(displayHeight - cropHeight, centerPx - cropHeight / 2))
  );

  function handleImgLoad(e) {
    naturalWidth = e.currentTarget.naturalWidth;
    naturalHeight = e.currentTarget.naturalHeight;
  }

  function updateFocusFromPointer(e) {
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clamped = Math.max(0, Math.min(rect.height, y));
    focusY = Math.round((clamped / rect.height) * 1000) / 10; // 소수점 1자리
  }

  function handlePointerDown(e) {
    dragging = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFocusFromPointer(e);
  }
  function handlePointerMove(e) {
    if (!dragging) return;
    updateFocusFromPointer(e);
  }
  function handlePointerUp() {
    dragging = false;
  }

  function save() {
    onSave?.(focusY);
    onClose?.();
  }
</script>

<div class="modal-overlay">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal" role="none" onclick={(e) => e.stopPropagation()}>
    <button class="modal-close" onclick={onClose}>✕</button>
    <h2>가로 배너 위치 설정</h2>
    <p class="hint">사진을 위아래로 드래그해서 가로 배너로 잘릴 때 중심이 될 위치를 지정하세요.</p>

    <div class="ratio-toggle">
      <button class:active={ratioMode === '16:9'} onclick={() => (ratioMode = '16:9')}>16:9</button>
      <button class:active={ratioMode === '18:9'} onclick={() => (ratioMode = '18:9')}>18:9</button>
    </div>

    <div
      class="image-stage"
      style="width:{CONTAINER_WIDTH}px; height:{displayHeight}px;"
      bind:this={imgEl}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
      role="slider"
      aria-label="배너 중심 위치"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={focusY}
      tabindex="0"
    >
      <img src={imageUrl} alt="" onload={handleImgLoad} draggable="false" />

      {#if displayHeight > 0}
        <div class="shade shade-top" style="height:{cropTop}px;"></div>
        <div class="shade shade-bottom" style="height:{displayHeight - cropTop - cropHeight}px;"></div>
        <div class="crop-box" style="top:{cropTop}px; height:{cropHeight}px;">
          <span class="crop-label">{ratioMode}</span>
        </div>
        <div class="focus-line" style="top:{centerPx}px;"></div>
      {/if}
    </div>

    <div class="focus-readout">중심 위치: {focusY}%</div>

    <div class="form-actions">
      <button class="btn-primary" onclick={save}>적용</button>
      <button class="btn-secondary" onclick={onClose}>취소</button>
    </div>
  </div>
</div>

<style lang="scss">
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    z-index: 1100;
  }

  .modal {
    background: #fff;
    border-radius: 12px;
    padding: 1.75rem;
    max-width: 90vw;
    max-height: 92vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    position: relative;

    h2 { margin: 0 0 0.4rem; font-size: 1.2rem; color: #111; }
  }

  .hint {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #666;
  }

  .modal-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: none;
    border: none;
    color: #888;
    font-size: 1.4rem;
    cursor: pointer;
    &:hover { color: #222; }
  }

  .ratio-toggle {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;

    button {
      padding: 0.35rem 0.9rem;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #444;

      &.active {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
      }
    }
  }

  .image-stage {
    position: relative;
    overflow: hidden;
    background: #eee;
    border-radius: 8px;
    cursor: ns-resize;
    touch-action: none;
    user-select: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }
  }

  .shade {
    position: absolute;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.55);
    pointer-events: none;
  }
  .shade-top { top: 0; }
  .shade-bottom { bottom: 0; }

  .crop-box {
    position: absolute;
    left: 0;
    width: 100%;
    border-top: 2px solid #fff;
    border-bottom: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) inset;
    pointer-events: none;

    .crop-label {
      position: absolute;
      top: 4px;
      left: 8px;
      font-size: 0.7rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.5);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
  }

  .focus-line {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: #ff3b30;
    pointer-events: none;
    transform: translateY(-1px);
  }

  .focus-readout {
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: #666;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
    justify-content: flex-end;
  }

  .btn-primary {
    padding: 0.55rem 1.1rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    &:hover { background: #1d4ed8; }
  }
  .btn-secondary {
    padding: 0.55rem 1.1rem;
    background: #f3f4f6;
    color: #444;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    &:hover { background: #e5e7eb; }
  }
</style>
