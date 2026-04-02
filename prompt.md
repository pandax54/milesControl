I have claude and copilot CLI available and a whole set of ai-tool with commands, tools, templates and etc with a bash script to run tasks like this:

I have IDE like vscode and opencode installed

I want a way to:

1. connect jira board (https://strvcom.atlassian.net/jira/software/projects/LD/boards/1042/backlog?selectedIssue=LD-14)
2. Pick tasks assigned to me - read the description - one at the time and understand the task, just pick new one when I finish the previous one - also move the ticket to "In Progress" column on the board
3. create new branch with the name of the task and the id of the task (e.g. LD-14) - use git worktree to create the branch
4. if the case ask me questions of the aspects of the task that are not 100% clear -> use telegram to warn me about it and create a file with the question that need to be answer before creating the PRD
5. once the questions are answered, continue with the flow described in the #ralph-once.sh or CLAUDE.md (both describe the same flow but in different ways) to create the PRD and the PRD checklist
6. once is done notify me on telegram that the PRD and checklist are ready for review and provide a link to the files created
7. once PRD is reviewed and approved, it time to start working on tech spec and tasks breakdown, so I want to use the same flow as the PRD but for the tech spec and task breakdown, and once they are ready, notify me on telegram again with the links to the files created
8. once all the necessary files are created and ready, the implamentation phase can start, so I can use bash script to run the task by task using telegram or terminal to trigger the bash scripts for each task, ([ralph-telegram-bot](ralph-telegram-bot.sh) or [ralph-once.sh](ralph-once.sh) can be used for this) and once the task is done I want to check all the reports because push it to github and create the PR, and also move the ticket to "Code Review" column on the board
9. once I merged the PR on github I want to be able to move the ticket to QA column (this part is done by human QA before it can be placed on 'ready to deployment' column on Jira) on the board and pick the next task assigned to me and repeat the process from step 2

is there any tools or scripts that can help me automate this workflow? I want to minimize the manual work and have a smooth integration between Jira, git, and my development environment.
I already have telegram set up for notifications, so I want to leverage that as much as possible for communication and updates throughout the process.
