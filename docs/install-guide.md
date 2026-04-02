# Install Script Guide

Copy boilerplate AI agent configuration files into any project on your machine with a single command.

---

## What Gets Installed

| Source      | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `.claude/`  | Claude Code settings, rules, commands, hooks, skills, and templates |
| `.github/`  | GitHub workflows and configuration                                  |
| `.agents/`  | Agent definitions and skills                                        |
| `AGENTS.md` | Agent behavior instructions                                         |
| `CLAUDE.md` | Claude project-level instructions                                   |

---

## Usage

```bash
# Basic — pass the target project path
./install.sh /path/to/your/project

# Example
./install.sh ~/Documents/repo/my-app

# Defaults to current directory if no argument is given
cd ~/Documents/repo/my-app
~/Documents/repo/ai-tools/fernanda-ribeiro/install.sh
```

### Install into Multiple Projects

```bash
for dir in ~/Documents/repo/project-a ~/Documents/repo/project-b ~/Documents/repo/project-c; do
  ./install.sh "$dir"
done
```

---

## Creating an Alias

Add one of the following to your shell config file (`~/.zshrc` on macOS):

```bash
# Open your shell config
nano ~/.zshrc
```

### Option 1 — Simple alias

```bash
alias ai-install="/Users/fernandapenna/Documents/repo/ai-tools/fernanda-ribeiro/install.sh"
```

Then use it anywhere:

```bash
ai-install ~/Documents/repo/my-project
```

### Option 2 — Alias that defaults to the current directory

```bash
ai-install() {
  /Users/fernandapenna/Documents/repo/ai-tools/fernanda-ribeiro/install.sh "${1:-$PWD}"
}
```

Then just `cd` into a project and run:

```bash
cd ~/Documents/repo/my-project
ai-install
```

### The quickest way to get started:

```bash
# 1. Add the alias to your shell
echo 'alias ai-install="/Users/fernandapenna/Documents/repo/ai-tools/fernanda-ribeiro/install.sh"' >> ~/.zshrc
source ~/.zshrc

# 2. Use it on any project
ai-install ~/Documents/repo/my-project
```

### Apply the Changes

After editing `~/.zshrc`, reload your shell:

```bash
source ~/.zshrc
```

The alias is now available in every new terminal session.

---

## Quick Reference

```bash
# Install to a specific project
ai-install ~/Documents/repo/my-project

# Install to the current directory
cd ~/Documents/repo/my-project && ai-install

# Batch install
for d in ~/Documents/repo/project-{a,b,c}; do ai-install "$d"; done
```
