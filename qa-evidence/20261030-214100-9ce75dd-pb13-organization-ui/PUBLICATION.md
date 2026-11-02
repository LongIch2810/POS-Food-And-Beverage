# Đóng gói bằng chứng khi publish — 02/11/2026

`api-tests-1.log` (23 MB) được publish dưới dạng [gzip lossless](api-tests-1.log.gz). Bản raw local giữ nguyên và được Git bỏ qua theo đúng đường dẫn; không xóa hoặc viết lại output gốc. [Metadata archive](publication-archive.json) lưu kích thước và SHA-256 raw/gzip. Đây là đóng gói lần chạy lịch sử, không phải chạy lại test.

Các liên kết và artifact manifest lịch sử vẫn trỏ tên raw ban đầu. Sau clone, khôi phục file trước khi kiểm toàn bộ manifest hoặc mở liên kết raw (chạy tại gốc repository):

```python
from pathlib import Path
import gzip, hashlib, json

folder = Path('qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui')
meta = json.loads((folder / 'publication-archive.json').read_text())
archive = Path(meta['archivePath']).read_bytes()
assert hashlib.sha256(archive).hexdigest() == meta['archiveSha256']
raw = gzip.decompress(archive)
assert hashlib.sha256(raw).hexdigest() == meta['rawSha256']
target = Path(meta['rawPath'])
if target.exists():
    assert target.read_bytes() == raw
else:
    target.write_bytes(raw)
```

Ảnh/snapshot/network/DB trong thư mục là fixture QA đã che mật khẩu/token theo run gốc. Không publish file credential nằm ngoài repository. Source/runtime manifests nhận diện working tree tại lúc kiểm thử trước commit; chúng không khẳng định base SHA đã chứa mã Sprint 3.
