# mst health

演奏者（Git Worktree）の健全性をチェックし、問題を検出・修正するコマンドです。古い演奏者の検出、未コミット変更の確認、リモートブランチとの同期状態などを総合的に診断します。

## 概要

```bash
mst health [options]
mst check [options]  # エイリアス
```

## 使用例

### 基本的な使用方法

```bash
# 全ての演奏者の健全性をチェック
mst health

# 修正可能な問題を自動修正
mst health --fix

# 古い演奏者を削除（デフォルト: 30日以上）
mst health --prune

# 詳細情報を表示
mst health --verbose
```

## オプション

| オプション   | 短縮形 | 説明                         | デフォルト |
| ------------ | ------ | ---------------------------- | ---------- |
| `--fix`      | `-f`   | 修正可能な問題を自動修正     | `false`    |
| `--prune`    | `-p`   | 古い演奏者を削除             | `false`    |
| `--days <n>` | `-d`   | 古いと判定する日数           | `30`       |
| `--verbose`  | `-v`   | 詳細情報を表示               | `false`    |
| `--json`     | `-j`   | JSON形式で出力               | `false`    |
| `--dry-run`  | `-n`   | 実際には修正せず、結果を表示 | `false`    |

## 検出される問題

### stale（古い演奏者）

長期間更新されていない演奏者：

```
⚠️  stale: feature/old-feature
   Last commit: 45 days ago
   Recommendation: Review and delete if no longer needed
```

### orphaned（孤立した演奏者）

リモートブランチが存在しない演奏者：

```
❌ orphaned: feature/deleted-remote
   Remote branch 'origin/feature/deleted-remote' not found
   Recommendation: Delete worktree or push to remote
```

### diverged（大きく乖離）

メインブランチから大きく乖離した演奏者：

```
⚠️  diverged: feature/long-running
   Behind main: 152 commits
   Ahead of main: 23 commits
   Recommendation: Rebase or merge with main branch
```

### uncommitted（未コミット変更）

未コミットの変更がある演奏者：

```
⚠️  uncommitted: feature/work-in-progress
   Modified files: 5
   Untracked files: 3
   Recommendation: Commit or stash changes
```

### conflict（マージ競合）

マージ競合が未解決の演奏者：

```
❌ conflict: feature/merge-conflict
   Conflicted files: 2
   Recommendation: Resolve conflicts and commit
```

### missing（ディレクトリ不在）

ディレクトリが存在しない演奏者：

```
❌ missing: feature/moved-worktree
   Directory not found: /path/to/worktree
   Recommendation: Remove worktree entry
```

## 出力形式

### 通常の出力

```
🏥 Orchestra Health Check

Checking 8 worktrees...

✅ main - healthy
⚠️  feature/auth - uncommitted (3 modified files)
❌ feature/old-ui - stale (60 days old)
⚠️  bugfix/memory-leak - diverged (behind: 45, ahead: 12)
✅ feature/api - healthy
❌ experiment/ml - orphaned (remote branch deleted)
⚠️  docs/update - uncommitted (2 untracked files)
✅ feature/dashboard - healthy

Summary:
- Total: 8
- Healthy: 3 (37.5%)
- Warnings: 3 (37.5%)
- Errors: 2 (25.0%)

Run 'mst health --fix' to auto-fix some issues
Run 'mst health --prune' to remove stale worktrees
```

### JSON出力（`--json`）

```json
{
  "timestamp": "2025-01-20T10:30:00Z",
  "worktrees": [
    {
      "branch": "main",
      "path": "/Users/user/project",
      "status": "healthy",
      "issues": []
    },
    {
      "branch": "feature/auth",
      "path": "/Users/user/project/.git/orchestra-members/feature-auth",
      "status": "warning",
      "issues": [
        {
          "type": "uncommitted",
          "severity": "warning",
          "details": {
            "modified": 3,
            "untracked": 0,
            "deleted": 0
          },
          "recommendation": "Commit or stash changes"
        }
      ]
    },
    {
      "branch": "feature/old-ui",
      "path": "/Users/user/project/.git/orchestra-members/feature-old-ui",
      "status": "error",
      "issues": [
        {
          "type": "stale",
          "severity": "error",
          "details": {
            "lastCommitDays": 60,
            "lastCommitDate": "2023-11-21T15:45:00Z"
          },
          "recommendation": "Review and delete if no longer needed"
        }
      ]
    }
  ],
  "summary": {
    "total": 8,
    "healthy": 3,
    "warning": 3,
    "error": 2,
    "fixable": 4
  }
}
```

## 自動修正機能

`--fix` オプションで以下の問題を自動修正できます：

### orphaned（孤立）の修正

```bash
mst health --fix
```

実行内容：

- リモートブランチが削除されている場合、ローカルのトラッキング情報を削除
- 必要に応じて新しいリモートブランチを作成するか確認

### missing（ディレクトリ不在）の修正

自動的にWorktreeエントリを削除：

```bash
git worktree prune
```

### 設定の不整合を修正

Worktree設定の不整合を検出して修正

## プルーニング（古い演奏者の削除）

```bash
# 30日以上古い演奏者を確認
mst health --prune --dry-run

# 実際に削除
mst health --prune

# 60日以上に変更
mst health --prune --days 60
```

プルーニング時の確認：

```
The following stale worktrees will be deleted:
- feature/old-ui (60 days old)
- experiment/abandoned (45 days old)
- bugfix/fixed-long-ago (90 days old)

? Proceed with deletion? (y/N)
```

## 定期メンテナンス

### Cronジョブの設定

```bash
# 毎日午前9時に健全性チェック
0 9 * * * cd /path/to/project && mst health --json > /tmp/mst-health.json

# 週次で古い演奏者をクリーンアップ
0 10 * * 1 cd /path/to/project && mst health --prune --days 30 --yes
```

### CI/CDでの活用

```yaml
# .github/workflows/health-check.yml
name: Worktree Health Check

on:
  schedule:
    - cron: '0 0 * * *' # 毎日実行

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install mst
        run: npm install -g maestro
      - name: Run health check
        run: |
          mst health --json > health-report.json
          if [ $(jq '.summary.error' health-report.json) -gt 0 ]; then
            echo "::error::Worktree health check failed"
            exit 1
          fi
```

## カスタムチェック

### 健全性レポートの生成

```bash
#!/bin/bash
# health-report.sh

echo "# Worktree Health Report - $(date)"
echo

# 基本情報
echo "## Summary"
mst health --json | jq -r '
  "- Total worktrees: \(.summary.total)",
  "- Healthy: \(.summary.healthy) (\(.summary.healthy / .summary.total * 100 | floor)%)",
  "- Issues found: \(.summary.warning + .summary.error)"
'

echo
echo "## Detailed Issues"

# 問題のある演奏者の詳細
mst health --json | jq -r '
  .worktrees[] |
  select(.status != "healthy") |
  "### \(.branch)",
  "- Status: \(.status)",
  "- Path: \(.path)",
  (.issues[] | "- Issue: \(.type) - \(.recommendation)")
'
```

### 問題別の対処

```bash
# 未コミット変更がある演奏者を一括処理
mst health --json | jq -r '.worktrees[] | select(.issues[].type == "uncommitted") | .branch' | while read branch; do
  echo "Processing $branch..."
  mst exec "$branch" git stash push -m "Auto-stash by health check"
done

# 孤立した演奏者を削除
mst health --json | jq -r '.worktrees[] | select(.issues[].type == "orphaned") | .branch' | while read branch; do
  mst delete "$branch" --force
done
```

## しきい値の設定

`.mst.json` で健全性チェックのしきい値を設定：

```json
{
  "health": {
    "staleThresholdDays": 30,
    "divergedThresholdCommits": 50,
    "autoFixEnabled": true,
    "checks": {
      "stale": true,
      "orphaned": true,
      "diverged": true,
      "uncommitted": true,
      "conflict": true,
      "missing": true
    }
  }
}
```

## Tips & Tricks

### 健全性スコアの算出

```bash
# 健全性スコアを計算（100点満点）
SCORE=$(mst health --json | jq '
  .summary.healthy / .summary.total * 100 | floor
')

echo "Worktree health score: $SCORE/100"

# 80点未満なら警告
if [ $SCORE -lt 80 ]; then
  echo "⚠️  Health score is low. Run 'mst health --fix' to improve."
fi
```

### 問題の自動通知

```bash
# Slack通知の例
ISSUES=$(mst health --json | jq '.summary.error + .summary.warning')

if [ $ISSUES -gt 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Worktree health check: $ISSUES issues found\"}" \
    YOUR_SLACK_WEBHOOK_URL
fi
```

### インタラクティブ修正

```bash
# 問題を一つずつ確認して修正
mst health --json | jq -r '.worktrees[] | select(.status != "healthy") | .branch' | while read branch; do
  echo "=== $branch ==="
  mst health --verbose | grep -A5 "$branch"

  read -p "Fix this issue? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # ここに修正ロジックを実装
    echo "Fixing $branch..."
  fi
done
```

## 関連コマンド

- [`mst list`](./list.md) - 演奏者の一覧と状態を表示
- [`mst delete`](./delete.md) - 問題のある演奏者を削除
- [`mst sync`](./sync.md) - 乖離した演奏者を同期
- [`mst snapshot`](./snapshot.md) - 修正前にスナップショットを作成
