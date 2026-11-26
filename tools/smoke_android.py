"""Exercise reading and WebView recovery on a fresh, rooted Android emulator."""
import re
import subprocess
import time
from xml.etree import ElementTree

PACKAGE = "ua.shlemko.bibliia"


def adb(*args):
    result = subprocess.run(
        ["adb", *args], capture_output=True, text=True, check=True, timeout=45
    )
    return result.stdout.strip()


def find(label):
    deadline = time.monotonic() + 75
    names = []
    while time.monotonic() < deadline:
        raw = adb("exec-out", "uiautomator", "dump", "/dev/tty")
        start = raw.find("<?xml")
        end = raw.find("</hierarchy>")
        if start >= 0 and end > start:
            nodes = ElementTree.fromstring(raw[start : end + len("</hierarchy>")])
            names = []
            for node in nodes.iter("node"):
                if node.get("package") != PACKAGE:
                    continue
                for prop in ("text", "content-desc"):
                    name = node.get(prop, "")
                    if not name:
                        continue
                    names.append(name[:70])
                    if label not in name:
                        continue
                    bounds = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
                    if bounds:
                        left, top, right, bottom = map(int, bounds.groups())
                        if right > left and bottom > top:
                            return (left + right) // 2, (top + bottom) // 2
        time.sleep(0.5)
    raise AssertionError(f"Missing {label!r} in Android accessibility tree: {names[:25]}")


def tap(label):
    x, y = find(label)
    adb("shell", "input", "tap", str(x), str(y))


def launch():
    adb("shell", "am", "start", "-W", "-n", PACKAGE + "/.ReaderActivity")


def main():
    launch()
    find("Буття")
    tap("На початку створив Бог")
    tap("Додати до закладок")
    tap("Закладки")
    find("Буття 1:1")
    print("Genesis and bookmarks passed", flush=True)

    tap("Пошук")
    tap("Ін 3:16")
    tap("Від Іоана 3:16")
    find("Бо так полюбив Бог")
    tap("Вигляд читання")
    tap("Темна")
    tap("Закрити")
    print("Reference lookup and reading controls passed", flush=True)

    pid = adb("shell", "pidof", PACKAGE)
    services = adb("shell", "ps", "-A", "-o", "PID,NAME")
    renderers = re.findall(r"^\s*(\d+)\s+com\.android\.webview:sandboxed_process\S*", services, re.MULTILINE)
    if len(renderers) != 1:
        raise AssertionError(f"Expected one isolated WebView renderer, found {renderers}")
    adb("shell", "kill", "-9", renderers[0])
    time.sleep(2)
    find("Бо так полюбив Бог")
    assert pid == adb("shell", "pidof", PACKAGE), "The Android activity process died"
    print("Reading position restored after renderer loss", flush=True)

    adb("shell", "am", "force-stop", PACKAGE)
    launch()
    find("Бо так полюбив Бог")
    tap("Закладки")
    find("Буття 1:1")
    print("Reading position and bookmark survived cold launch", flush=True)


if __name__ == "__main__":
    main()
