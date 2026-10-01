const {
  Stage,
  Sprite,
  useTime,
  useSprite,
  interpolate,
  Easing
} = window.Animations;
const green = '#163c34',
  lime = '#c3ee87';
function Reveal({
  children,
  delay = 0
}) {
  const {
    elapsed
  } = useSprite();
  const p = interpolate(elapsed, [delay, delay + .65], [0, 1], Easing.expoOut);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: p,
      transform: `translateY(${(1 - p) * 32}px)`
    }
  }, children);
}
function SceneIntro() {
  const {
    elapsed
  } = useSprite();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene opening"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline"
  }, "RESEARCH DESK / \u7814\u9009"), /*#__PURE__*/React.createElement("h1", null, "\u8FD9\u4E2A\u5F00\u6E90\u9879\u76EE\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u503C\u5F97\u7EE7\u7EED\u7814\u7A76\u5417\uFF1F"), /*#__PURE__*/React.createElement(Reveal, {
    delay: .6
  }, /*#__PURE__*/React.createElement("p", null, "\u628A\u8D44\u6599\u3001\u8BC1\u636E\u4E0E\u91C7\u7528\u5224\u65AD\uFF0C\u653E\u8FDB\u540C\u4E00\u4E2A\u5DE5\u4F5C\u53F0\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "intro-line",
    style: {
      width: interpolate(elapsed, [.5, 2], [0, 550], Easing.expoOut)
    }
  }), /*#__PURE__*/React.createElement("small", null, "\u5DE5\u4F5C\u6D41\u6982\u5FF5\u6F14\u793A \xB7 \u6837\u672C\u4E3A\u771F\u5B9E\u4ED3\u5E93"));
}
function SceneLibrary() {
  const {
    elapsed
  } = useSprite();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene light"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scene-label"
  }, "01 / \u9879\u76EE\u7B5B\u9009"), /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", null, "\u5148\u627E\u5230\u9002\u5408\u5F53\u524D\u4EFB\u52A1\u7684\u5DE5\u5177\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "shot",
    style: {
      transform: `translateY(${interpolate(elapsed, [0, .7], [80, 0], Easing.expoOut)}px) scale(${interpolate(elapsed, [.7, 4.7], [.91, .96])})`
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/prototype-library.png"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cursor",
    style: {
      left: interpolate(elapsed, [1.2, 2.5], [850, 700]),
      top: interpolate(elapsed, [1.2, 2.5], [500, 367])
    }
  }, "\u2196", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: elapsed > 2.6 ? 1 : 0
    }
  }, "\u6253\u5F00\u7814\u7A76"))), /*#__PURE__*/React.createElement("p", {
    className: "caption"
  }, "\u6309\u7528\u9014\u641C\u7D22\uFF0C\u67E5\u770B\u9879\u76EE\u6458\u8981\u3002"));
}
function SceneEvidence() {
  const {
    elapsed
  } = useSprite();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene light"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scene-label"
  }, "02 / \u8BC1\u636E\u4E0E\u8FB9\u754C"), /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", null, "\u770B\u6E05\u80FD\u529B\uFF0C\u4E5F\u770B\u6E05\u8FD8\u7F3A\u4EC0\u4E48\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "shot",
    style: {
      transform: `translateX(${interpolate(elapsed, [0, .75], [140, 0], Easing.expoOut)}px) scale(.96)`
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/prototype-detail.png"
  })), /*#__PURE__*/React.createElement("p", {
    className: "caption"
  }, "\u6BCF\u4E2A\u6765\u6E90\u90FD\u6307\u5411\u56FA\u5B9A\u7248\u672C\uFF0C\u907F\u514D\u628A\u613F\u666F\u5F53\u4F5C\u5DF2\u5B9E\u73B0\u529F\u80FD\u3002"));
}
function SceneDecision() {
  const {
    elapsed
  } = useSprite();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene closing"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scene-label"
  }, "03 / \u91C7\u7528\u5224\u65AD"), /*#__PURE__*/React.createElement("div", {
    className: "closing-copy"
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", null, "\u8BA9\u4E0B\u4E00\u6B65\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u6709\u636E\u53EF\u67E5\u3002")), /*#__PURE__*/React.createElement(Reveal, {
    delay: .7
  }, /*#__PURE__*/React.createElement("p", null, "\u8BB0\u5F55\u91C7\u7528\u7406\u7531", /*#__PURE__*/React.createElement("br", null), "\u5199\u4E0B\u771F\u5B9E\u9A8C\u8BC1\u4EFB\u52A1", /*#__PURE__*/React.createElement("br", null), "\u628A\u7ED3\u8BBA\u4E0B\u8F7D\u7559\u6863")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 1.5
  }, /*#__PURE__*/React.createElement("div", {
    className: "end-label"
  }, "\u7814\u9009 / \u5F00\u6E90\u9879\u76EE\u7814\u7A76\u5DE5\u4F5C\u53F0"))), /*#__PURE__*/React.createElement("img", {
    className: "decision-shot",
    src: "assets/prototype-decision.png",
    style: {
      transform: `translateX(${interpolate(elapsed, [.2, 1], [150, 0], Easing.expoOut)}px)`
    }
  }), /*#__PURE__*/React.createElement("small", null, "\u539F\u578B\u4EA4\u4E92\u5728\u6D4F\u89C8\u5668\u4F53\u9A8C \xB7 \u672C\u89C6\u9891\u4E3A\u9884\u8BBE\u6D41\u7A0B\uFF0C\u65E0\u914D\u97F3"));
}
function ClockEvidence() {
  const t = useTime();
  return /*#__PURE__*/React.createElement("div", {
    className: "time-evidence",
    "data-time": t.toFixed(3),
    style: {
      width: t / 20 * 1280 + 'px'
    }
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Stage, {
  duration: 20,
  width: 1280,
  height: 720,
  loop: false,
  bgColor: green
}, /*#__PURE__*/React.createElement(Sprite, {
  start: 0,
  end: 4
}, /*#__PURE__*/React.createElement(SceneIntro, null)), /*#__PURE__*/React.createElement(Sprite, {
  start: 4,
  end: 9
}, /*#__PURE__*/React.createElement(SceneLibrary, null)), /*#__PURE__*/React.createElement(Sprite, {
  start: 9,
  end: 14
}, /*#__PURE__*/React.createElement(SceneEvidence, null)), /*#__PURE__*/React.createElement(Sprite, {
  start: 14,
  end: 20
}, /*#__PURE__*/React.createElement(SceneDecision, null)), /*#__PURE__*/React.createElement(ClockEvidence, null)));