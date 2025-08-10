export const en = {
  // Common
  common: {
    cancel: 'Cancelled',
    error: 'Error',
    success: 'Success',
    yes: 'Yes',
    no: 'No',
  },

  // Init command
  init: {
    welcome: '🎼 Welcome to Maestro Setup!',
    existingConfig: '.maestro.json already exists. Overwrite it?',
    configCancelled: 'Configuration initialization cancelled',
    detectedProject: 'Detected project: {{type}}{{status}}',
    detectedStatus: ' ✅',
    noAutoDetect: ' (no auto-detection)',
    creatingConfig: 'Creating configuration file...',
    configCreated: '✨ .maestro.json has been created!',
    configFailed: 'Failed to create configuration file',
    setupComplete: '🎉 Maestro setup complete!',
    nextSteps: 'Next steps:',
    createCommand: 'mst create <branch-name>  # Create a new worktree',
    listCommand: 'mst list                  # List worktrees',
    helpCommand: 'mst --help               # Show other commands',
    autoCommands: '💡 Commands that will run automatically when creating worktrees: {{commands}}',

    // Prompts
    prompts: {
      language: 'Select your preferred language',
      packageManager: 'Which package manager do you use?',
      packageManagerNone: 'none (no package manager)',
      worktreePath: 'Where should worktrees be created?',
      branchPrefix: 'Branch name prefix?',
      defaultEditor: 'Default editor?',
      defaultEditorOther: 'Other',
      autoSetup: 'Enable automatic dependency installation?',
      copyEnvFiles: 'Copy environment files to worktrees?',
      syncFiles: 'Specify files to copy (comma-separated):',
    },
  },

  // Create command
  create: {
    newMember: 'Creating new orchestra member...',
    memberCreated: '✨ New orchestra member created: {{path}}',
    memberFailed: 'Failed to create orchestra member',
    environmentSetup: 'Setting up environment...',
    environmentComplete: '✨ Environment setup complete',
    environmentFailed: 'Environment setup failed: {{error}}',
    openedInEditor: '✨ Opened in {{editor}}',
    editorFailed: 'Failed to launch editor: {{error}}',
    copyingFiles: 'Copying files...',
    filesCopied: '✨ {{count}} file(s) copied',
    gitignoreFiles: 'gitignore files: {{files}}',
    filesNotFound: 'No files to sync found',
    fileNotFound: '{{file}} not found, skipping copy',
    fileCopyFailed: '⚠️  Failed to copy file {{file}}: {{error}}',
    fileNotFile: '⚠️  {{file}} is not a file',
    enteringShell: "🎼 Entering shell for orchestra member '{{branch}}'...",
    shellExited: '🎼 Shell exited',
    commandRunning: '🎵 Running command: {{command}}',
    commandSuccess: '✨ Command executed successfully',
    commandFailed: 'Command execution failed: {{error}}',
    sessionPrompt: 'Attach to session?',
    attachingSession: "🎵 Attaching to tmux session '{{session}}'...",
    sessionAttachLater: '📝 To attach later, run:',
    sessionDetachHint: '💡 Hint: Use Ctrl+B, D to detach from session',
    sessionCreated: "✨ tmux session '{{session}}' created{{details}}",
    sessionSplitDetails: ' with {{count}} {{type}} panes{{layout}}',
    sessionExists: "tmux session '{{session}}' already exists",
    panesSplit: '✅ tmux panes split into {{count}} {{type}} panes{{layout}}: {{branch}}',
    sharedClaudeMode: '✨ CLAUDE.md set to shared mode',
    splitClaudeMode: '✨ CLAUDE.md created in split mode',
    claudeFailed: 'Failed to process CLAUDE.md: {{error}}',
  },

  // List command
  list: {
    orchestraComposition: '🎼 Orchestra Composition (worktrees):',
    noWorktrees: 'No orchestra members found',
    currentMarker: 'current',
    lockedMarker: 'locked',
    prunableMarker: 'prunable',
    total: 'Total: {{count}} orchestra member(s)',
  },

  // Delete command
  delete: {
    checkingMembers: 'Checking orchestra members...',
    selectMember: 'Select orchestra member to remove (Tab for multiple, Ctrl-C to cancel)',
    confirmDelete: 'Remove these worktrees?',
    confirmSingleDelete: "Remove orchestra member '{{branch}}'?",
    deleting: 'Removing orchestra member...',
    memberExiting: "Orchestra member '{{branch}}' is exiting...",
    deleted: "✨ Orchestra member '{{branch}}' has exited",
    deleteFailed: 'Failed to remove orchestra member: {{error}}',
    cancelled: 'Cancelled',
    noWorktrees: 'No orchestra members exist',
    exitTargets: '🪽  Orchestra members to exit:\n',
    totalMembers: 'Total: {{count}} orchestra member(s)',
    exitResults: '🎼 Exit Results:\n',
    success: 'Success',
    failed: 'Failed',
    totalResults: 'Total: {{success}} succeeded, {{failed}} failed',
    membersExited: '✨ {{count}} orchestra member(s) have exited',
    remoteBranchDeleting: 'Deleting remote branch...',
    remoteBranchDeleted: "Remote branch '{{branch}}' deleted",
    remoteBranchNotFound: "Remote branch '{{branch}}' does not exist",
    remoteBranchFailed: 'Failed to delete remote branch',
    tmuxSessionDeleted: "tmux session '{{session}}' deleted",
    patternNotFound: 'No orchestra members match the specified pattern',
    branchNotFound: 'Specified orchestra member not found',
    similarBranches: '\nSimilar orchestra members:',
    warningDelete: '⚠️  Are you sure you want to delete the selected worktrees?',
    locked: 'locked',
    prunable: 'prunable',
    lockedWarning: '⚠️  Locked: {{reason}}',
    currentDirInWorktree: 'Current directory is inside the worktree to be deleted.\nPlease run from a different directory.\nExample: cd .. && mst delete {{branch}}',
  },

  // Tmux command
  tmux: {
    orchestration: 'Orchestration!',
    tmuxNotInstalled: 'tmux is not installed',
    fzfNotInstalled: 'fzf is not installed',
    installMethod: 'Installation:',
    notGitRepo: 'This directory is not a Git repository',
    noMembers: 'No orchestra members exist',
    createMethod: 'To create:',
    worktreeNotFound: "Worktree '{{name}}' not found",
    sessionCreating: "Creating new tmux session '{{session}}'...",
    sessionCreated: "New tmux session '{{session}}' created",
    sessionExists: "Session '{{session}}' already exists",
    sessionList: '📋 Tmux session list:',
    sessionAttachHint: '💡 Hint: tmux attach -t <session-name> to attach to a session',
    newWindowOpened: "✨ New window '{{branch}}' opened",
    paneSplit: "✨ Pane {{type}} split for '{{branch}}'",
    memberSelected: "✨ Orchestra member '{{branch}}' selected",
    moveCommand: 'cd {{path}} to navigate',
    launchingEditor: 'Launching editor: {{command}}',
    cancelled: 'Cancelled',
    errorOccurred: 'An error occurred',
    sessionFromExit: 'Returned from tmux session',
    selectMember: 'Select orchestra member (Ctrl-C to cancel)',
    noActiveSession: 'No active sessions',
    attachingToSession: "Attaching to tmux session '{{session}}'...",
    tmuxHelp: `
📚 tmux Quick Reference:
  
  Navigation:
  • Ctrl+B, ↑/↓/←/→  Navigate between panes
  • Ctrl+B, o        Cycle through panes
  • Ctrl+B, q        Show pane numbers (press number to jump)
  • Ctrl+B, z        Toggle pane zoom (fullscreen)
  
  Windows:
  • Ctrl+B, c        Create new window
  • Ctrl+B, n/p      Next/Previous window
  • Ctrl+B, 0-9      Switch to window by number
  • Ctrl+B, w        List windows
  
  Session Control:
  • Ctrl+B, d        Detach from session (keeps it running)
  • Ctrl+B, s        List/Switch sessions
  • exit or Ctrl+D   Close current pane/window
  
  💡 Tip: All commands start with Ctrl+B, then release and press the next key
`,
  },

  // Attach command (creates worktree from existing branch)
  attach: {
    orchestration: 'Orchestration!',
    summoning: 'Create worktree from existing branch (attach branch to new worktree)',
    fetchingLatest: 'Fetching latest from remote...',
    fetchingBranches: 'Fetching branch list...',
    noAvailableBranches: 'No available branches',
    allBranchesAttached: 'All branches are already attached as orchestra members',
    selectBranch: 'Which branch would you like to attach to a worktree?',
    branchNotFound: "Error: Branch '{{branch}}' not found",
    availableBranches: '\nAvailable branches:',
    summoningMember: 'Summoning orchestra member...',
    memberSummoned: "Orchestra member '{{branch}}' has been summoned!\n  📁 {{path}}",
    settingUpEnvironment: 'Setting up environment...',
    setupComplete: '{{manager}} install complete',
    setupSkipped: '{{manager}} install skipped',
    openingInEditor: 'Opening in editor...',
    openedInCursor: 'Opened in Cursor',
    openedInVSCode: 'Opened in VSCode',
    editorNotFound: 'Editor not found',
    executingCommand: '\n🎵 Executing command: {{command}}',
    commandFailed: 'Command execution failed: {{error}}',
    enteringShell: '\n🎵 Entering shell...',
    exitedShell: '\nExited from shell',
    summonComplete: '\n✨ Orchestra member summoning complete!',
    moveToDirectory: '\ncd {{path}} to navigate',
    memberNotSummoned: 'Failed to summon orchestra member',
  },

  // Shell command
  shell: {
    enteringMemberShell: 'Enter orchestra member shell',
    branchNameArg: 'Branch name (interactive selection if omitted)',
    selectWithFzf: 'Select with fzf',
    runCommandAndExit: 'Run specified command and exit',
    attachExistingTmux: 'Attach to existing tmux session (create if not exists)',
    tmuxVerticalSplit: 'Start shell in tmux vertical split pane',
    tmuxHorizontalSplit: 'Start shell in tmux horizontal split pane',
    noMembers: 'No orchestra members exist',
    createHint: 'maestro create <branch-name> to summon an orchestra member',
    errorTmuxOptions: 'Error: Please specify only one tmux option',
    errorTmuxRequired: 'Error: tmux options require being inside a tmux session',
    errorFzfNotInstalled: 'Error: fzf is not installed',
    selectMemberShell: 'Select orchestra member to enter shell (Ctrl-C to cancel)',
    whichMemberEnter: 'Which orchestra member to enter?',
    enteringMember: "\n🎼 Entering orchestra member '{{branch}}'...",
    executingCommand: '🔧 Command execution: {{command}}',
    commandComplete: '\n✅ Command execution complete (exit code: {{code}})',
    commandFailed: '❌ Command execution failed: {{error}}',
    attachingExistingTmux: "📺 Attaching to existing tmux session '{{session}}'",
    creatingNewTmux: "📺 Creating new tmux session '{{session}}'",
    returnedFromTmux: '\ntmux session exited',
    tmuxFailed: '❌ tmux session processing failed: {{error}}',
    fallingBackToShell: 'Starting with normal shell...',
    startingTmuxPane: "\n🎼 Starting tmux {{type}} shell for orchestra member '{{branch}}'",
    tmuxPaneFailed: '❌ Failed to start tmux {{type}}: {{error}}',
    errorTargetUndefined: 'Error: targetWorktree is undefined',
    shellType: '🐚 Shell: {{shell}}',
    returnedFromMember: '\nReturned from orchestra member (exit code: {{code}})',
  },

  // Exec command
  exec: {
    executeInMember: 'Execute command in orchestra member',
    commandArg: 'Command to execute',
    branchArg: 'Branch name (interactive selection if omitted)',
    selectWithFzf: 'Select with fzf',
    executeInAll: 'Execute in all worktrees',
    noMembers: 'No orchestra members exist',
    createHint: 'Create with: maestro create <branch-name>',
    selectMember: 'Select orchestra member to execute command (Ctrl-C to cancel)',
    whichMemberExec: 'Which orchestra member to execute in?',
    commandRequired: 'Command is required',
    executing: 'Executing in {{count}} orchestra member(s)...',
    executionResults: '\n🎼 Execution Results:\n',
    exitCode: 'Exit code',
    totalResults: '\nTotal: {{success}} succeeded, {{failed}} failed',
    output: 'Output',
  },

  // Config command
  config: {
    displayingConfig: 'Displaying configuration',
    projectPath: 'Project config path',
    globalPath: 'Global config path',
    notFound: 'Not found',
    currentConfig: 'Current Configuration:',
    projectConfig: '📁 Project Configuration',
    globalConfig: '🌍 Global Configuration',
    noProjectConfig: 'No project configuration found',
    noGlobalConfig: 'No global configuration found',
    settingConfig: "Setting configuration '{{key}}' = '{{value}}'",
    configSet: '✨ Configuration updated',
    removingConfig: "Removing configuration '{{key}}'",
    configRemoved: '✨ Configuration removed',
    resettingConfig: 'Resetting configuration',
    configReset: '✨ Configuration reset',
  },

  // Where command
  where: {
    showingPath: 'Show orchestra member path',
    branchArg: 'Branch name',
    absolutePath: 'Show absolute path',
    cdCommand: 'Output cd command',
    copyToClipboard: 'Copy to clipboard',
    branchRequired: 'Branch name is required',
    memberNotFound: "Orchestra member '{{branch}}' not found",
    copiedToClipboard: '📋 Copied to clipboard',
  },

  // Sync command
  sync: {
    syncingFiles: 'Sync files between main and worktrees',
    fileArgs: 'Files to sync',
    syncToMain: 'Sync from worktree to main',
    interactive: 'Interactive mode',
    selectWithFzf: 'Select files with fzf',
    currentMemberSyncing: 'Syncing from current orchestra member...',
    notInWorktree: 'Not in a worktree directory',
    mainBranchSyncing: 'Syncing from main branch',
    cannotSyncToMain: 'Cannot sync from main to main',
    noFilesSpecified: 'No files specified',
    selectFilesToSync: 'Select files to sync',
    filesNotFound: 'Specified files not found',
    confirmSync: 'Sync {{count}} file(s)?',
    syncing: 'Syncing...',
    syncComplete: '✨ Sync complete: {{count}} file(s)',
    syncFailed: 'Sync failed',
  },

  // GitHub command  
  github: {
    creatingPR: 'Create GitHub Pull Request',
    openingPR: 'Open Pull Request page',
    listingPRs: 'List Pull Requests',
    notInWorktree: 'Not in a worktree. Please run from a worktree directory.',
    selectTargetBranch: 'Select target branch',
    prTitle: 'Pull Request title',
    prDescription: 'Pull Request description (optional)',
    assignees: 'Assignees (comma-separated GitHub usernames)',
    createDraft: 'Create as draft',
    creatingDraftPR: 'Creating draft Pull Request...',
    creatingPRNormal: 'Creating Pull Request...',
    prCreated: '✨ Pull Request created',
    prFailed: 'Failed to create Pull Request',
    prStatus: 'PR Status',
    author: 'Author',
    created: 'Created',
    draft: 'Draft',
    changedFiles: 'files changed',
    additions: 'additions',
    deletions: 'deletions',
    noPRsFound: 'No Pull Requests found',
    openingInBrowser: 'Opening in browser...',
    fetchingMetadata: 'Fetching GitHub metadata...',
  },

  // Completion command
  completion: {
    generatingCompletion: 'Generate shell completion',
    shellArg: 'Shell type',
    saveToFile: 'Save to file',
    outputFile: 'Output file path',
  },

  // Push command
  push: {
    pushingBranch: 'Push current branch to remote',
    setUpstream: 'Set upstream branch',
    forcePush: 'Force push',
    forcePushLease: 'Force push with lease',
    notInWorktree: 'Not in a worktree. Please run from a worktree directory.',
    checkingBranch: 'Checking current branch...',
    cannotPushMain: 'Cannot push from main branch. Please use a worktree.',
    pushingToRemote: 'Pushing to remote...',
    pushComplete: '✨ Push complete',
    upstreamSet: 'Upstream branch set: {{branch}}',
    pushFailed: 'Push failed',
  },

  // Review command
  review: {
    aiCodeReview: 'AI-powered code review',
    baseBranchArg: 'Base branch for comparison',
    modelArg: 'AI model to use',
    detailedReview: 'Detailed review',
    checkingDiff: 'Checking differences...',
    noDifferences: 'No differences from {{branch}}',
    requestingReview: 'Requesting AI review...',
    changeSummary: '📊 Change Summary',
    files: 'Files',
    additions: 'Additions',
    deletions: 'Deletions',
    reviewResult: '🤖 AI Review Result',
    reviewFailed: 'Review failed',
  },

  // Issue command
  issue: {
    createFromIssue: 'Create worktree from GitHub issue',
    issueNumberArg: 'Issue number',
    branchPrefixOpt: 'Branch name prefix',
    openEditor: 'Open in editor after creation',
    attachTmux: 'Create and attach tmux session',
    fetchingIssue: 'Fetching issue information...',
    issueNotFound: 'Issue not found',
    creating: 'Creating worktree from issue #{{number}}...',
    createdFromIssue: '✨ Created worktree from issue',
    title: 'Title',
    author: 'Author',
    branch: 'Branch',
    worktree: 'Worktree',
  },

  // History command
  history: {
    showHistory: 'Show command history',
    limitArg: 'Number of items to show',
    showStats: 'Show statistics',
    clearHistory: 'Clear history',
    noHistory: 'No history',
    commandHistory: '📜 Command History',
    historyCleared: '✨ History cleared',
    statistics: '📊 Statistics',
    totalCommands: 'Total commands',
    uniqueCommands: 'Unique commands',
    mostUsed: 'Most used',
  },

  // Graph command
  graph: {
    showGraph: 'Show worktree dependency graph',
    outputFormat: 'Output format',
    showOrphans: 'Show orphaned worktrees',
    orchestraStructure: '🎼 Orchestra Structure',
    noWorktrees: 'No worktrees found',
  },

  // Health command
  health: {
    checkHealth: 'Check Maestro installation health',
    checkingHealth: '🏥 Checking Maestro Health...',
    statusOK: 'OK',
    statusWarning: 'Warning',
    statusError: 'Error',
    gitInstalled: 'Git installed',
    gitVersion: 'Git version',
    inGitRepo: 'In Git repository',
    tmuxInstalled: 'tmux installed',
    tmuxVersion: 'tmux version',
    tmuxNotInstalled: 'tmux not installed (optional)',
    fzfInstalled: 'fzf installed',
    fzfNotInstalled: 'fzf not installed (optional)',
    configFound: 'Configuration found',
    worktreeCount: 'Worktree count',
    healthStatus: 'Health Status',
    allGood: 'All systems operational',
    hasWarnings: 'Has warnings but functional',
    hasErrors: 'Has errors requiring attention',
  },

  // Snapshot command
  snapshot: {
    createSnapshot: 'Create worktree state snapshot',
    snapshotName: 'Snapshot name',
    includeUntracked: 'Include untracked files',
    creating: 'Creating snapshot...',
    created: '✨ Snapshot created: {{name}}',
    failed: 'Failed to create snapshot',
  },

  // CLI main
  cli: {
    description: '🎼 Maestro - Git worktree orchestration for parallel development with Claude Code',
    error: 'Error',
  },

  // Error messages
  errors: {
    notGitRepo: 'This directory is not a Git repository',
    general: 'Unknown error',
  },
}

export type TranslationKeys = typeof en
