"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("pages/index",{

/***/ "./src/utils/bin/api_commands.ts":
/*!***************************************!*\
  !*** ./src/utils/bin/api_commands.ts ***!
  \***************************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"projects\": function() { return /* binding */ projects; },\n/* harmony export */   \"quote\": function() { return /* binding */ quote; },\n/* harmony export */   \"readme\": function() { return /* binding */ readme; },\n/* harmony export */   \"weather\": function() { return /* binding */ weather; }\n/* harmony export */ });\n/* harmony import */ var _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/next/dist/compiled/regenerator-runtime/runtime.js */ \"./node_modules/next/dist/compiled/regenerator-runtime/runtime.js\");\n/* harmony import */ var _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../api */ \"./src/utils/api.ts\");\nfunction asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {\n    try {\n        var info = gen[key](arg);\n        var value = info.value;\n    } catch (error) {\n        reject(error);\n        return;\n    }\n    if (info.done) {\n        resolve(value);\n    } else {\n        Promise.resolve(value).then(_next, _throw);\n    }\n}\nfunction _asyncToGenerator(fn) {\n    return function() {\n        var self = this, args = arguments;\n        return new Promise(function(resolve, reject) {\n            var gen = fn.apply(self, args);\n            function _next(value) {\n                asyncGeneratorStep(gen, resolve, reject, _next, _throw, \"next\", value);\n            }\n            function _throw(err) {\n                asyncGeneratorStep(gen, resolve, reject, _next, _throw, \"throw\", err);\n            }\n            _next(undefined);\n        });\n    };\n}\n\n// // List of commands that require API calls\n\n\n\n\nvar projects = function() {\n    var _ref = _asyncToGenerator(_Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee(args) {\n        var projects1;\n        return _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_ctx) {\n            while(1)switch(_ctx.prev = _ctx.next){\n                case 0:\n                    _ctx.next = 2;\n                    return (0,_api__WEBPACK_IMPORTED_MODULE_1__.getProjects)();\n                case 2:\n                    projects1 = _ctx.sent;\n                    return _ctx.abrupt(\"return\", projects1.map(function(repo) {\n                        return \"\".concat(repo.name, ' - <a class=\"text-light-blue dark:text-dark-blue underline\" href=\"').concat(repo.html_url, '\" target=\"_blank\">').concat(repo.html_url, \"</a>\");\n                    }).join(\"\\n\"));\n                case 4:\n                case \"end\":\n                    return _ctx.stop();\n            }\n        }, _callee);\n    }));\n    return function projects(args) {\n        return _ref.apply(this, arguments);\n    };\n}();\nvar quote = function() {\n    var _ref = _asyncToGenerator(_Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee(args) {\n        var data;\n        return _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_ctx) {\n            while(1)switch(_ctx.prev = _ctx.next){\n                case 0:\n                    _ctx.next = 2;\n                    return (0,_api__WEBPACK_IMPORTED_MODULE_1__.getQuote)();\n                case 2:\n                    data = _ctx.sent;\n                    return _ctx.abrupt(\"return\", data.quote);\n                case 4:\n                case \"end\":\n                    return _ctx.stop();\n            }\n        }, _callee);\n    }));\n    return function quote(args) {\n        return _ref.apply(this, arguments);\n    };\n}();\nvar readme = function() {\n    var _ref = _asyncToGenerator(_Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee(args) {\n        var readme1;\n        return _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_ctx) {\n            while(1)switch(_ctx.prev = _ctx.next){\n                case 0:\n                    _ctx.next = 2;\n                    return (0,_api__WEBPACK_IMPORTED_MODULE_1__.getReadme)();\n                case 2:\n                    readme1 = _ctx.sent;\n                    return _ctx.abrupt(\"return\", \"Opening GitHub README...\\n\".concat(readme1));\n                case 4:\n                case \"end\":\n                    return _ctx.stop();\n            }\n        }, _callee);\n    }));\n    return function readme(args) {\n        return _ref.apply(this, arguments);\n    };\n}();\nvar weather = function() {\n    var _ref = _asyncToGenerator(_Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().mark(function _callee(args) {\n        var city, weather1;\n        return _Users_shiyang_Desktop_Trace_web_shiyanglai_github_io_node_modules_next_dist_compiled_regenerator_runtime_runtime_js__WEBPACK_IMPORTED_MODULE_0___default().wrap(function _callee$(_ctx) {\n            while(1)switch(_ctx.prev = _ctx.next){\n                case 0:\n                    city = args.join(\"+\");\n                    if (city) {\n                        _ctx.next = 3;\n                        break;\n                    }\n                    return _ctx.abrupt(\"return\", \"Usage: weather [city]. Example: weather casablanca\");\n                case 3:\n                    _ctx.next = 5;\n                    return (0,_api__WEBPACK_IMPORTED_MODULE_1__.getWeather)(city);\n                case 5:\n                    weather1 = _ctx.sent;\n                    return _ctx.abrupt(\"return\", weather1);\n                case 7:\n                case \"end\":\n                    return _ctx.stop();\n            }\n        }, _callee);\n    }));\n    return function weather(args) {\n        return _ref.apply(this, arguments);\n    };\n}();\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevExports = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevExports) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports on update so we can compare the boundary\n                // signatures.\n                module.hot.dispose(function (data) {\n                    data.prevExports = currentExports;\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevExports !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevExports, currentExports)) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevExports !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvdXRpbHMvYmluL2FwaV9jb21tYW5kcy50cy5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUZBLDZDQUE2QztBQUVSO0FBQ0g7QUFDQztBQUNDO0FBRTdCLElBQU1JLFFBQVE7ZUFBRyxvTUFBT0MsSUFBYyxFQUFzQjtZQUMzREQsU0FBUTs7Ozs7MkJBQVNKLGlEQUFXLEVBQUU7O29CQUE5QkksU0FBUSxZQUFzQjtpREFDN0JBLFNBQVEsQ0FDWkUsR0FBRyxDQUNGLFNBQUNDLElBQUk7K0JBQ0gsRUFBQyxDQUFnRkEsTUFBYSxDQUEzRkEsSUFBSSxDQUFDQyxJQUFJLEVBQUMsb0VBQWtFLENBQWdCLENBQW9CRCxNQUFhLENBQS9DQSxJQUFJLENBQUNFLFFBQVEsRUFBQyxvQkFBa0IsQ0FBZ0IsT0FBSSxDQUFsQkYsSUFBSSxDQUFDRSxRQUFRLEVBQUMsTUFBSSxDQUFDO3FCQUFBLENBQ3pJLENBQ0FDLElBQUksQ0FBQyxJQUFJLENBQUM7Ozs7OztLQUNkO29CQVJZTixRQUFRLENBQVVDLElBQWM7OztHQVE1QyxDQUFDO0FBRUssSUFBTU0sS0FBSztlQUFHLG9NQUFPTixJQUFjLEVBQXNCO1lBQ3hETyxJQUFJOzs7OzsyQkFBU1gsOENBQVEsRUFBRTs7b0JBQXZCVyxJQUFJLFlBQW1CO2lEQUN0QkEsSUFBSSxDQUFDRCxLQUFLOzs7Ozs7S0FDbEI7b0JBSFlBLEtBQUssQ0FBVU4sSUFBYzs7O0dBR3pDLENBQUM7QUFFSyxJQUFNUSxNQUFNO2VBQUcsb01BQU9SLElBQWMsRUFBc0I7WUFDekRRLE9BQU07Ozs7OzJCQUFTWCwrQ0FBUyxFQUFFOztvQkFBMUJXLE9BQU0sWUFBb0I7aURBQ3pCLDRCQUEyQixDQUFTLE9BQVBBLE9BQU0sQ0FBRTs7Ozs7O0tBQzdDO29CQUhZQSxNQUFNLENBQVVSLElBQWM7OztHQUcxQyxDQUFDO0FBRUssSUFBTVMsT0FBTztlQUFHLG9NQUFPVCxJQUFjLEVBQXNCO1lBQzFEVSxJQUFJLEVBSUpELFFBQU87Ozs7b0JBSlBDLElBQUksR0FBR1YsSUFBSSxDQUFDSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3ZCSyxJQUFJOzs7O2lEQUNBLG9EQUFvRDs7OzJCQUV2Q1osZ0RBQVUsQ0FBQ1ksSUFBSSxDQUFDOztvQkFBaENELFFBQU8sWUFBeUI7aURBQy9CQSxRQUFPOzs7Ozs7S0FDZjtvQkFQWUEsT0FBTyxDQUFVVCxJQUFjOzs7R0FPM0MsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9zcmMvdXRpbHMvYmluL2FwaV9jb21tYW5kcy50cz81ZjNmIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIC8vIExpc3Qgb2YgY29tbWFuZHMgdGhhdCByZXF1aXJlIEFQSSBjYWxsc1xuXG5pbXBvcnQgeyBnZXRQcm9qZWN0cyB9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQgeyBnZXRRdW90ZSB9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQgeyBnZXRSZWFkbWUgfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHsgZ2V0V2VhdGhlciB9IGZyb20gJy4uL2FwaSc7XG5cbmV4cG9ydCBjb25zdCBwcm9qZWN0cyA9IGFzeW5jIChhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gIGNvbnN0IHByb2plY3RzID0gYXdhaXQgZ2V0UHJvamVjdHMoKTtcbiAgcmV0dXJuIHByb2plY3RzXG4gICAgLm1hcChcbiAgICAgIChyZXBvKSA9PlxuICAgICAgICBgJHtyZXBvLm5hbWV9IC0gPGEgY2xhc3M9XCJ0ZXh0LWxpZ2h0LWJsdWUgZGFyazp0ZXh0LWRhcmstYmx1ZSB1bmRlcmxpbmVcIiBocmVmPVwiJHtyZXBvLmh0bWxfdXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7cmVwby5odG1sX3VybH08L2E+YCxcbiAgICApXG4gICAgLmpvaW4oJ1xcbicpO1xufTtcblxuZXhwb3J0IGNvbnN0IHF1b3RlID0gYXN5bmMgKGFyZ3M6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmc+ID0+IHtcbiAgY29uc3QgZGF0YSA9IGF3YWl0IGdldFF1b3RlKCk7XG4gIHJldHVybiBkYXRhLnF1b3RlO1xufTtcblxuZXhwb3J0IGNvbnN0IHJlYWRtZSA9IGFzeW5jIChhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gIGNvbnN0IHJlYWRtZSA9IGF3YWl0IGdldFJlYWRtZSgpO1xuICByZXR1cm4gYE9wZW5pbmcgR2l0SHViIFJFQURNRS4uLlxcbiR7cmVhZG1lfWA7XG59O1xuXG5leHBvcnQgY29uc3Qgd2VhdGhlciA9IGFzeW5jIChhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gIGNvbnN0IGNpdHkgPSBhcmdzLmpvaW4oJysnKTtcbiAgaWYgKCFjaXR5KSB7XG4gICAgcmV0dXJuICdVc2FnZTogd2VhdGhlciBbY2l0eV0uIEV4YW1wbGU6IHdlYXRoZXIgY2FzYWJsYW5jYSc7XG4gIH1cbiAgY29uc3Qgd2VhdGhlciA9IGF3YWl0IGdldFdlYXRoZXIoY2l0eSk7XG4gIHJldHVybiB3ZWF0aGVyO1xufTtcbiJdLCJuYW1lcyI6WyJnZXRQcm9qZWN0cyIsImdldFF1b3RlIiwiZ2V0UmVhZG1lIiwiZ2V0V2VhdGhlciIsInByb2plY3RzIiwiYXJncyIsIm1hcCIsInJlcG8iLCJuYW1lIiwiaHRtbF91cmwiLCJqb2luIiwicXVvdGUiLCJkYXRhIiwicmVhZG1lIiwid2VhdGhlciIsImNpdHkiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/utils/bin/api_commands.ts\n");

/***/ })

});