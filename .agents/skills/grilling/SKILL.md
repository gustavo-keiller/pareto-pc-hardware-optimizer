---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea to surface hidden assumptions and lock down tradeoffs. Use when the user wants to stress-test their thinking, uses the '/grill-me' slash command, or when a design has two or more plausible approaches with unresolved tradeoffs.
---

# Grilling

Interview the user relentlessly until you reach a shared understanding. This workflow can be invoked using the `/grill-me` slash command in Antigravity.

Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled. Ask the whole frontier in one round: number each question and give your recommended answer.

Format a round like so:

```text
❓ **Q1** - **<question title>**: <question body>

➡️ <your recommended answer>
```

When formulating questions and answers, strictly adhere to the domain vocabulary defined in `CONTEXT.md`.
Finding facts in the codebase is your job, not the user's.
The session is done when every branch is visited. Do not act on it until the user confirms.
