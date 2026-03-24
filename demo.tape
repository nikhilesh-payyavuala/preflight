# Preflight CLI Demo - interactive plan picker + approve
Output demo.gif
Set Shell "zsh"
Set FontSize 16
Set Width 1200
Set Height 700
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set CursorBlink false

Sleep 1s
Hide
Type "export PATH=$HOME/.bun/bin:$PATH"
Enter
Sleep 500ms
Show

# Launch interactive picker
Type "pf show"
Sleep 200ms
Enter

# Wait for fzf to load, hold on the picker view
Sleep 3s

# Select the highlighted plan
Enter

# Hold on the action menu (Approve / Reject / etc.)
Sleep 5s

# Select Approve
Enter
Sleep 2s
