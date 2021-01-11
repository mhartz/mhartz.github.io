(() => {
  const modelViewer = document.querySelector('#model');
  let doorIsOpen = false;

  document.getElementById('door-trigger').addEventListener('click', () => {
    modelViewer.animationName = 'Door_grpAction';

    if (!doorIsOpen) {
      self.setTimeout(() => {
        modelViewer.pause();
        doorIsOpen = true;
      }, 5000);
    } else {
      modelViewer.play();

      self.setTimeout(() => {
        modelViewer.pause();
        doorIsOpen = false;
      }, 3000);
    }
  });
})();