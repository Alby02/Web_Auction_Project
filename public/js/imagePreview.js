function handleImageUpload(input, preview) {
    input.addEventListener('change', function () {
        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function () {
            preview.src = reader.result;
            preview.style.display = 'block';
        }

        if (file) {
            reader.readAsDataURL(file);
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }
    });
}

export default handleImageUpload;