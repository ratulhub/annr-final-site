document.querySelectorAll('form.shihiko-currency-form').forEach((form) => {
	form.querySelectorAll('input[name="currency"], select[name="currency"]').forEach((control) => {
		control.addEventListener('change', () => {
			if (form.dataset.submitting === 'true') return;
			form.dataset.submitting = 'true';
			form.submit();
		});
	});
});
