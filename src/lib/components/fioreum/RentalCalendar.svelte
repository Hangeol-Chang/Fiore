<script>
    import { onMount } from 'svelte';
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    // status: 'approved' (예약 완료) | 'pending' (승인 대기)
    let eventsByDate = {};
    let loading = false;

    let today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth(); // 0-based

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function dateKey(y, m, d) {
        return `${y}-${pad(m + 1)}-${pad(d)}`;
    }

    function isToday(y, m, d) {
        return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    }

    async function loadCalendar() {
        loading = true;
        try {
            const res = await fetch(`${API}/api/rentals/calendar?year=${viewYear}&month=${viewMonth + 1}`);
            const data = await res.json();
            const grouped = {};
            if (Array.isArray(data)) {
                for (const slot of data) {
                    if (!grouped[slot.date]) grouped[slot.date] = [];
                    grouped[slot.date].push(slot);
                }
                for (const key in grouped) {
                    grouped[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
                }
            }
            eventsByDate = grouped;
        } catch {
            eventsByDate = {};
        } finally {
            loading = false;
        }
    }

    function prevMonth() {
        if (viewMonth === 0) {
            viewMonth = 11;
            viewYear -= 1;
        } else {
            viewMonth -= 1;
        }
        loadCalendar();
    }

    function nextMonth() {
        if (viewMonth === 11) {
            viewMonth = 0;
            viewYear += 1;
        } else {
            viewMonth += 1;
        }
        loadCalendar();
    }

    function goToday() {
        viewYear = today.getFullYear();
        viewMonth = today.getMonth();
        loadCalendar();
    }

    onMount(loadCalendar);

    export function refresh() {
        loadCalendar();
    }

    $: cells = (() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        const result = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            result.push({ day: daysInPrevMonth - i, outside: true, events: [], key: null });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const key = dateKey(viewYear, viewMonth, d);
            result.push({
                day: d,
                outside: false,
                events: eventsByDate[key] || [],
                key,
                today: isToday(viewYear, viewMonth, d)
            });
        }
        const remainder = result.length % 7;
        if (remainder !== 0) {
            for (let d = 1; d <= 7 - remainder; d++) {
                result.push({ day: d, outside: true, events: [], key: null });
            }
        }
        return result;
    })();
</script>

<section class="rental-calendar">
    <h2 class="calendar-title">대관 현황</h2>

    <div class="calendar-header">
        <button type="button" class="nav-btn" on:click={prevMonth} aria-label="이전 달">
            <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <button type="button" class="month-label" on:click={goToday}>
            {viewYear}년 {viewMonth + 1}월
        </button>
        <button type="button" class="nav-btn" on:click={nextMonth} aria-label="다음 달">
            <ChevronRight size={22} strokeWidth={2} />
        </button>
    </div>

    <div class="calendar-grid weekdays">
        {#each WEEKDAYS as w, i}
            <div class="weekday" class:sun={i === 0} class:sat={i === 6}>{w}</div>
        {/each}
    </div>

    <div class="calendar-grid days">
        {#each cells as cell, i}
            <div
                class="day-cell"
                class:outside={cell.outside}
                class:today={cell.today}
                class:sun={i % 7 === 0}
                class:sat={i % 7 === 6}
            >
                <span class="day-num">{cell.day}</span>
                <div class="events">
                    {#each cell.events as ev}
                        <div class="event-chip" class:booked={ev.status === 'approved'} class:pending={ev.status === 'pending'}>
                            <span class="event-time">{ev.start_time} ~ {ev.end_time}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>

    <div class="legend">
        <div class="legend-item">
            <span class="legend-dot booked"></span>
            <span>예약 완료</span>
        </div>
        <div class="legend-item">
            <span class="legend-dot pending"></span>
            <span>승인 대기</span>
        </div>
    </div>
</section>

<style>
    .rental-calendar {
        max-width: 1200px;
        margin: 48px auto 0;
        padding: 0 16px 48px;
    }

    .calendar-title {
        font-size: 1.4rem;
        font-weight: 600;
        margin-bottom: 24px;
        text-align: center;
    }

    .calendar-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 20px;
    }

    .nav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        background: transparent;
        color: #7b6c6c;
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.15s;
    }

    .nav-btn:hover {
        background: rgba(123, 108, 108, 0.08);
    }

    .month-label {
        font-size: 1.2rem;
        font-weight: 600;
        color: #4a3f3f;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px 12px;
        border-radius: 4px;
        transition: background 0.15s;
        min-width: 140px;
        text-align: center;
    }

    .month-label:hover {
        background: rgba(123, 108, 108, 0.08);
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
    }

    .weekdays {
        margin-bottom: 4px;
    }

    .weekday {
        text-align: center;
        font-size: 0.85rem;
        font-weight: 600;
        color: #999;
        padding: 8px 0;
    }

    .weekday.sun {
        color: #c0392b;
    }

    .weekday.sat {
        color: #3a6ea5;
    }

    .day-cell {
        position: relative;
        min-height: 110px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 8px 6px;
        font-size: 0.9rem;
        color: #444;
        border-top: 1px solid #ece3d8;

        @media (--mobile) {
            min-height: 84px;
            padding: 6px 4px;
        }
    }

    .day-cell.outside {
        color: #ccc;
    }

    .day-cell.sun .day-num {
        color: #c0392b;
    }

    .day-cell.sat .day-num {
        color: #3a6ea5;
    }

    .day-num {
        font-size: 0.9rem;
        margin-bottom: 4px;
    }

    .day-cell.today .day-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #7b6c6c;
        color: #fff;
        font-weight: 600;
        font-size: 0.8rem;
    }

    .events {
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
    }

    .event-chip {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 0.72rem;
    }

    .event-chip.booked {
        background: rgba(94, 138, 158, 0.12);
        border-left-color: #5e8a9e;
        color: #4a7186;
    }

    .event-chip.pending {
        background: rgba(212, 160, 23, 0.1);
        border-left-color: #d4a017;
        color: #96760f;
    }

    .event-time {
        font-weight: 600;
    }

    .legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #ece3d8;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #666;
    }

    .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .legend-dot.booked {
        background: #5e8a9e;
    }

    .legend-dot.pending {
        background: #d4a017;
    }
</style>
