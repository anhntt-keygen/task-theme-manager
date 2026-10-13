import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('FocusFlow - Pomodoro Focus Timer E2E Test Suite [TEA 1.27.2]', () => {

  test.beforeEach(async ({ page }) => {
    // Truy cập ứng dụng trước mỗi test case
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ==========================================
  // [SC-01] CHẾ ĐỘ GIAO DIỆN SÁNG/TỐI (LIGHT/DARK MODE)
  // ==========================================
  test('[SC-01] Chuyển đổi giao diện Sáng/Tối và lưu trạng thái vào LocalStorage', async ({ page }) => {
    const htmlElement = page.locator('html');
    const themeToggleBtn = page.locator('#theme-toggle');
    const themeIcon = page.locator('#theme-icon');

    // Mặc định ban đầu là Light Mode
    await expect(htmlElement).not.toHaveClass(/dark/);
    await expect(themeIcon).toHaveClass(/fa-moon/);

    // Click chuyển sang Dark Mode
    await themeToggleBtn.click();
    await expect(htmlElement).toHaveClass(/dark/);
    await expect(themeIcon).toHaveClass(/fa-sun/);

    // Kiểm tra lưu trữ trạng thái trong LocalStorage
    const savedStateBeforeReload = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('focusflow_state'));
    });
    expect(savedStateBeforeReload.theme).toBe('dark');

    // Tải lại trang để kiểm tra tính bền vững dữ liệu
    await page.reload();
    await expect(htmlElement).toHaveClass(/dark/);
    await expect(themeIcon).toHaveClass(/fa-sun/);
  });

  // ==========================================
  // [SC-02] ĐỒNG HỒ POMODORO & ĐIỀU KHIỂN
  // ==========================================
  test('[SC-02] Chuyển đổi chế độ đếm ngược và điều khiển đồng hồ', async ({ page }) => {
    const timerDisplay = page.locator('#timer-display');
    const timerStatus = page.locator('#timer-status');
    const btnStartPause = page.locator('#btn-start-pause');
    const btnReset = page.locator('#btn-reset');
    const btnShort = page.locator('#btn-short');
    const btnLong = page.locator('#btn-long');
    const btnPomodoro = page.locator('#btn-pomodoro');

    // 1. Kiểm tra trạng thái mặc định
    await expect(timerDisplay).toHaveText('25:00');
    await expect(timerStatus).toHaveText('Sẵn sàng');

    // 2. Chuyển sang chế độ Nghỉ ngắn
    await btnShort.click();
    await expect(timerDisplay).toHaveText('05:00');

    // 3. Chuyển sang chế độ Nghỉ dài
    await btnLong.click();
    await expect(timerDisplay).toHaveText('15:00');

    // 4. Quay lại Pomodoro và bắt đầu chạy
    await btnPomodoro.click();
    await btnStartPause.click();
    await expect(timerStatus).toHaveText('Đang tập trung');
    await expect(btnStartPause).toHaveText('Tạm dừng');

    // Chờ 2 giây để kiểm tra thời gian giảm xuống
    await page.waitForTimeout(2100);
    const timeText = await timerDisplay.innerText();
    expect(timeText).not.toBe('25:00');

    // 5. Tạm dừng đồng hồ
    await btnStartPause.click();
    await expect(timerStatus).toHaveText('Tạm dừng');
    await expect(btnStartPause).toHaveText('Tiếp tục');

    // 6. Đặt lại đồng hồ (Reset)
    await btnReset.click();
    await expect(timerDisplay).toHaveText('25:00');
    await expect(timerStatus).toHaveText('Sẵn sàng');
  });

  // ==========================================
  // [SC-03] CẤU HÌNH THỜI GIAN & KIỂM TRA ĐẦU VÀO
  // ==========================================
  test('[SC-03] Thay đổi cấu hình thời gian và kiểm tra tính hợp lệ dữ liệu', async ({ page }) => {
    const inputPomodoro = page.locator('#input-pomodoro');
    const timerDisplay = page.locator('#timer-display');
    const configError = page.locator('#config-error');

    // 1. Thay đổi thời gian hợp lệ (ví dụ: 45 phút)
    await inputPomodoro.fill('45');
    await inputPomodoro.dispatchEvent('input');
    await expect(timerDisplay).toHaveText('45:00');
    await expect(configError).toBeHidden();

    // 2. Nhập giá trị không hợp lệ (ngoài khoảng 1 - 180)
    await inputPomodoro.fill('200');
    await inputPomodoro.dispatchEvent('input');
    await expect(configError).toBeVisible();

    await inputPomodoro.fill('0');
    await inputPomodoro.dispatchEvent('input');
    await expect(configError).toBeVisible();
  });

  // ==========================================
  // [SC-04] QUẢN LÝ TÁC VỤ (TO-DO LIST)
  // ==========================================
  test('[SC-04] Thêm, hoàn thành và xóa tác vụ trong danh sách', async ({ page }) => {
    const taskInput = page.locator('#task-input');
    const taskForm = page.locator('#task-form');
    const tasksContainer = page.locator('#tasks-container');

    // 1. Thêm tác vụ mới
    await taskInput.fill('Viết tài liệu kiểm thử Playwright');
    await taskForm.submit();

    const firstTask = tasksContainer.locator('div').first();
    await expect(firstTask).toBeVisible();
    await expect(firstTask.locator('span')).toHaveText('Viết tài liệu kiểm thử Playwright');

    // 2. Đánh dấu hoàn thành tác vụ
    const completeBtn = firstTask.locator('button').first();
    await completeBtn.click();
    await expect(firstTask.locator('span')).toHaveClass(/line-through/);

    // 3. Xóa tác vụ khỏi danh sách
    const deleteBtn = firstTask.locator('button').last();
    await deleteBtn.click();
    await expect(tasksContainer.locator('div')).toHaveCount(0);
  });

});