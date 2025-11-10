// pomodoro-worker.js

let timerId = null;
let timeLeft = 0;
let currentMode = 'work';

self.onmessage = (event) => {
  const { type, timeLeft: newTimeLeft, mode } = event.data;

  switch (type) {
    case 'start':
      if (timerId) {
        clearInterval(timerId);
      }
      timeLeft = newTimeLeft;
      currentMode = mode;

      timerId = setInterval(() => {
        timeLeft -= 1;
        self.postMessage({ type: 'tick', timeLeft });

        if (timeLeft <= 0) {
          clearInterval(timerId);
          timerId = null;
          self.postMessage({ type: 'completed', mode: currentMode });
        }
      }, 1000);
      break;

    case 'pause':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    case 'reset':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      timeLeft = 0;
      break;
      
    default:
      console.error('Unknown message type received by pomodoro worker:', type);
  }
};
