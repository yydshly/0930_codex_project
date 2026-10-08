"use strict";
// An actual deterministic drawing example, independent of any model service.
const timeInput = document.getElementById("code-time");
const timeObject = document.getElementById("time-object");
const timeLabel = document.getElementById("code-time-label");
const xLabel = document.getElementById("code-x-label");
function drawAt(seconds) {
  const x = 45 + 126 * seconds;
  timeObject.setAttribute("transform", `translate(${x} 36)`);
  timeLabel.textContent = `${seconds.toFixed(2)} s`;
  xLabel.textContent = `x = ${x.toFixed(1)}`;
}
timeInput.addEventListener("input", () => drawAt(Number(timeInput.value)));
drawAt(Number(timeInput.value));
