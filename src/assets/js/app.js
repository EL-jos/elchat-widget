document.querySelectorAll('.el-form-group').forEach(group => {
    const input = group.querySelector('input');
    const btnShow = group.querySelector('.el-btn-show-password');
    const btnMask = group.querySelector('.el-btn-mask-password');

    btnShow.addEventListener('click', () => {
        input.type = 'text';
        btnShow.classList.add('el-hidden');
        btnMask.classList.remove('el-hidden');
    });

    btnMask.addEventListener('click', () => {
        input.type = 'password';
        btnMask.classList.add('el-hidden');
        btnShow.classList.remove('el-hidden');
    });
});