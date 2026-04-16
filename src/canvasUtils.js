export function getCanvasPoint(event, canvas) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    return null;
  }

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
}

function resizeCanvasToDisplaySize(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const nextWidth = Math.max(1, Math.floor(bounds.width));
  const nextHeight = Math.max(1, Math.floor(bounds.height));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
}

function drawPolyline(context, points, color, lineWidth) {
  if (points.length === 0) {
    return;
  }

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = lineWidth;

  if (points.length > 1) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.stroke();
  }

  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }
}

export function renderCanvasScene({
  canvas,
  polylineA,
  polylineB,
  interpolatedPolyline,
  showInterpolated,
}) {
  resizeCanvasToDisplaySize(canvas);

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  drawPolyline(context, polylineA, "#2563eb", 2);
  drawPolyline(context, polylineB, "#dc2626", 2);

  if (showInterpolated) {
    drawPolyline(context, interpolatedPolyline, "#16a34a", 3);
  }
}
