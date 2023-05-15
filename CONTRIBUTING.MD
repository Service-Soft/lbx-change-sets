# Contributing to LbxChangeSets
Thank you for considering to contribute to this project!
<br>
All development is done using github.

# Table of Contents
- [Contributing to LbxChangeSets](#contributing-to-lbxchangesets)
- [Table of Contents](#table-of-contents)
- [Create an Issue](#create-an-issue)
  - [Special guidelines for bug reports](#special-guidelines-for-bug-reports)
- [Starting the project](#starting-the-project)
- [Codestyle](#codestyle)
- [Workflow for submitting Code Changes](#workflow-for-submitting-code-changes)
- [License](#license)

# Create an Issue
If you want to ask a question, need a new feature, found gaps in the documentation, found a bug, found code that can be refactored etc. you first have to start with creating an Issue.
<br>
Please check if there is already an issue for your problem.
<br>
Right now there are now specific guidelines for Issues, other than that their name and description should include enough details so that everyone knows what the issue is about. You should also include some fitting tags.

## Special guidelines for bug reports

Great Bug Reports tend to have:

- A quick summary
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

# Starting the project
1. Run `npm install` in the root directory,
2. Run `npm run build` in the root directory. This will This will build the package.

# Codestyle
This project is using eslint and requires all linting to pass in order to merge pull requests. It can happen that you need to use code that is against some of the rules (e.g. required use of "any"). In that case you can of course disable that rule at that specific point with
<br>
`// eslint-disable-next-line the-rule-to-disable`
> You can run eslint with the command `npm run lint`
> <br>
> You can autofix some codestyle problems with `npm run lint:fix`

# Workflow for submitting Code Changes

1. Create an issue if it not already exists.
2. Create a branch for that specific issue (The best way to this is directly inside the issue on the right side under "Development". That way the issue and the branch are automatically linked)
3. Checkout the new branch
4. Add your code
5. Update the documentation.
6. Check that tests and linting passes.
7. Rebase to dev and solve any merge-conflicts (`git rebase dev`)
8. Issue that pull request!

# License
By contributing to this project, you agree that your contributions will be licensed under its MIT License.