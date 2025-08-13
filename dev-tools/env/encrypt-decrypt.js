#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../');

// 提示用户确认
const askConfirmation = async (message) => {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: false
    }
  ]);
  return confirmed;
};

// 让用户选择要应用的变更
const selectChangesToApply = async (allChanges) => {
  if (allChanges.length === 0) {
    return [];
  }

  console.log(chalk.cyan.bold('\n📋 请选择要应用的变更:'));

  const { selectedChanges } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedChanges',
      message: '选择要应用的变更 (使用空格键选择/取消选择，回车键确认):',
      choices: [
        {
          name: chalk.cyan.bold('全选'),
          value: 'SELECT_ALL',
          checked: false
        },
        new inquirer.Separator(chalk.gray('─'.repeat(50))),
        ...allChanges.map(change => ({
          name: change.displayName,
          value: change.key,
          checked: true // 默认全选
        }))
      ],
      validate: (answer) => {
        if (answer.length === 0) {
          return '请至少选择一个变更项目';
        }
        return true;
      }
    }
  ]);

  // 处理全选逻辑
  if (selectedChanges.includes('SELECT_ALL')) {
    return allChanges.map(change => change.key);
  }

  return selectedChanges;
};

// 解析环境变量文件
const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        env[key] = value;
      }
    }
  }

  return env;
};

// 比较两个环境变量对象，返回差异
const compareEnvObjects = (oldEnv, newEnv) => {
  const changes = {
    added: {},
    modified: {},
    removed: {},
    unchanged: {}
  };

  // 检查新增和修改的变量
  for (const [key, newValue] of Object.entries(newEnv)) {
    if (!(key in oldEnv)) {
      changes.added[key] = newValue;
    } else if (oldEnv[key] !== newValue) {
      changes.modified[key] = {
        old: oldEnv[key],
        new: newValue
      };
    } else {
      changes.unchanged[key] = newValue;
    }
  }

  // 检查删除的变量
  for (const [key, oldValue] of Object.entries(oldEnv)) {
    if (!(key in newEnv)) {
      changes.removed[key] = oldValue;
    }
  }

  return changes;
};

// 显示变更摘要并让用户选择要应用的变更
const displayChangeSummaryAndSelect = async (changes, options = {}) => {
  const { added, modified, removed, unchanged } = changes;

  console.log('\n' + chalk.cyan('='.repeat(60)));
  console.log(chalk.cyan.bold('环境变量变更摘要'));
  console.log(chalk.cyan('='.repeat(60)));

  const allChanges = [];

  // 新增变量表格
  if (Object.keys(added).length > 0) {
    console.log(chalk.green.bold(`\n✅ 新增变量 (${Object.keys(added).length}):`));

    if (!options.quiet) {
      const addedTable = new Table({
        head: [chalk.green('变量名'), chalk.green('值')],
        colWidths: [30, 50],
        style: { head: [], border: ['green'] }
      });

      for (const [key, value] of Object.entries(added)) {
        const displayValue = value.length > 45 ? value.substring(0, 42) + '...' : value;
        addedTable.push([chalk.bold(key), chalk.green(displayValue)]);
        allChanges.push({ type: 'added', key, value, displayName: `➕ ${key} (新增)` });
      }
      console.log(addedTable.toString());
    } else {
      // 静默模式下只显示变量名
      for (const [key, value] of Object.entries(added)) {
        console.log(`  ➕ ${chalk.bold(key)}`);
        allChanges.push({ type: 'added', key, value, displayName: `➕ ${key} (新增)` });
      }
    }
  }

  // 修改变量表格
  if (Object.keys(modified).length > 0) {
    console.log(chalk.yellow.bold(`\n🔄 修改变量 (${Object.keys(modified).length}):`));

    if (!options.quiet) {
      const modifiedTable = new Table({
        head: [chalk.yellow('变量名'), chalk.yellow('旧值'), chalk.yellow('新值')],
        colWidths: [25, 35, 35],
        style: { head: [], border: ['yellow'] }
      });

      for (const [key, { old, new: newValue }] of Object.entries(modified)) {
        const displayOld = old.length > 30 ? old.substring(0, 27) + '...' : old;
        const displayNew = newValue.length > 30 ? newValue.substring(0, 27) + '...' : newValue;
        modifiedTable.push([
          chalk.bold(key),
          chalk.red(displayOld),
          chalk.green(displayNew)
        ]);
        allChanges.push({ type: 'modified', key, old, new: newValue, displayName: `🔄 ${key} (修改)` });
      }
      console.log(modifiedTable.toString());
    } else {
      // 静默模式下只显示变量名
      for (const [key, { old, new: newValue }] of Object.entries(modified)) {
        console.log(`  🔄 ${chalk.bold(key)}`);
        allChanges.push({ type: 'modified', key, old, new: newValue, displayName: `🔄 ${key} (修改)` });
      }
    }
  }

  // 删除变量表格
  if (Object.keys(removed).length > 0) {
    console.log(chalk.red.bold(`\n❌ 删除变量 (${Object.keys(removed).length}):`));

    if (!options.quiet) {
      const removedTable = new Table({
        head: [chalk.red('变量名'), chalk.red('值')],
        colWidths: [30, 50],
        style: { head: [], border: ['red'] }
      });

      for (const [key, value] of Object.entries(removed)) {
        const displayValue = value.length > 45 ? value.substring(0, 42) + '...' : value;
        removedTable.push([chalk.bold(key), chalk.red(displayValue)]);
        allChanges.push({ type: 'removed', key, value, displayName: `❌ ${key} (删除)` });
      }
      console.log(removedTable.toString());
    } else {
      // 静默模式下只显示变量名
      for (const [key, value] of Object.entries(removed)) {
        console.log(`  ❌ ${chalk.bold(key)}`);
        allChanges.push({ type: 'removed', key, value, displayName: `❌ ${key} (删除)` });
      }
    }
  }

  // 统计信息
  const totalChanges = Object.keys(added).length + Object.keys(modified).length + Object.keys(removed).length;

  if (totalChanges === 0) {
    console.log(chalk.green.bold('\n✨ 没有检测到任何变更'));
    return { hasChanges: false, selectedChanges: [] };
  }

  if (!options.quiet) {
    // 摘要表格
    const summaryTable = new Table({
      head: [chalk.cyan('变更类型'), chalk.cyan('数量')],
      colWidths: [20, 10],
      style: { head: [], border: ['cyan'] }
    });

    summaryTable.push(
      [chalk.green('新增'), chalk.green.bold(Object.keys(added).length)],
      [chalk.yellow('修改'), chalk.yellow.bold(Object.keys(modified).length)],
      [chalk.red('删除'), chalk.red.bold(Object.keys(removed).length)],
      [chalk.gray('未变更'), chalk.gray(Object.keys(unchanged).length)],
      [chalk.cyan.bold('总计变更'), chalk.cyan.bold(totalChanges)]
    );

    console.log('\n' + summaryTable.toString());
  }

  return { hasChanges: true, allChanges };
};

// 获取私钥（静默版本，避免重复输出）
const getPrivateKey = (showMessage = true) => {
  let privateKey = '';
  const keysFile = path.join(rootDir, '.env.keys');

  if (fs.existsSync(keysFile)) {
    try {
      const keysContent = fs.readFileSync(keysFile, 'utf8');
      const match = keysContent.match(/DOTENV_PRIVATE_KEY=([^\r\n]+)/);
      if (match && match[1]) {
        privateKey = match[1].trim();
        if (showMessage) {
          console.log(chalk.green('✅ 已从 .env.keys 文件加载私钥'));
        }
      } else {
        if (showMessage) {
          console.warn(chalk.yellow('⚠️  在 .env.keys 文件中未找到 DOTENV_PRIVATE_KEY'));
        }
      }
    } catch (error) {
      if (showMessage) {
        console.warn(chalk.yellow(`⚠️  无法读取 .env.keys 文件: ${error.message}`));
      }
    }
  }

  if (!privateKey && !process.env.DOTENV_PRIVATE_KEY) {
    console.error(chalk.red('❌ 未找到 DOTENV_PRIVATE_KEY，请设置环境变量或在 .env.keys 文件中提供'));
    process.exit(1);
  }

  return privateKey || process.env.DOTENV_PRIVATE_KEY;
};

// 根据用户选择过滤变更
const filterChangesBySelection = (changes, selectedKeys) => {
  const filtered = {
    added: {},
    modified: {},
    removed: {},
    unchanged: changes.unchanged
  };

  // 过滤新增变量
  for (const [key, value] of Object.entries(changes.added)) {
    if (selectedKeys.includes(key)) {
      filtered.added[key] = value;
    } else {
      filtered.unchanged[key] = value;
    }
  }

  // 过滤修改变量
  for (const [key, value] of Object.entries(changes.modified)) {
    if (selectedKeys.includes(key)) {
      filtered.modified[key] = value;
    } else {
      filtered.unchanged[key] = value.old; // 保持旧值
    }
  }

  // 过滤删除变量
  for (const [key, value] of Object.entries(changes.removed)) {
    if (selectedKeys.includes(key)) {
      filtered.removed[key] = value;
    } else {
      filtered.unchanged[key] = value; // 保持原值
    }
  }

  return filtered;
};



// 执行加密/解密操作
const executeOperation = async (command, sourceFile, targetFile, privateKey, selectedChanges = null, originalChanges = null, oldEnv = null, newEnv = null) => {
  const envVars = { DOTENV_PRIVATE_KEY: privateKey, ...process.env };
  const operationText = command === 'encrypt' ? '加密' : '解密';

  let spinner;

  try {
    // 如果有选择的变更，只处理变更的部分
    if (selectedChanges && originalChanges && oldEnv && newEnv) {
      spinner = ora(`正在处理选择的变更...`).start();

      // 读取现有目标文件内容（如果存在）
      let existingTargetContent = '';
      if (fs.existsSync(targetFile)) {
        existingTargetContent = fs.readFileSync(targetFile, 'utf8');
      }

      // 只处理有变化的环境变量
      const changedEnv = {};

      // 收集需要处理的变更
      for (const [key, value] of Object.entries(originalChanges.added)) {
        if (selectedChanges.includes(key)) {
          changedEnv[key] = value;
        }
      }

      for (const [key, { new: newValue }] of Object.entries(originalChanges.modified)) {
        if (selectedChanges.includes(key)) {
          changedEnv[key] = newValue;
        }
      }

      if (Object.keys(changedEnv).length > 0) {
        // 创建只包含变更内容的临时文件
        const tempFile = path.join(rootDir, '.temp_changes_only');
        const changedContent = Object.entries(changedEnv)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        fs.writeFileSync(tempFile, changedContent);

        spinner.text = `正在${operationText}变更的环境变量...`;

        // 对变更的内容进行加密/解密
        const cmd = command === 'encrypt'
          ? `npx @dotenvx/dotenvx encrypt -f ${tempFile} --stdout`
          : `npx @dotenvx/dotenvx decrypt -f ${tempFile} --stdout`;

        const processedChanges = execSync(cmd, {
          cwd: rootDir,
          env: envVars,
          encoding: 'utf8'
        });

        // 清理临时文件
        fs.unlinkSync(tempFile);

        // 解析处理后的变更
        fs.writeFileSync(path.join(rootDir, '.temp_processed'), processedChanges);
        const processedChangesObj = parseEnvFile(path.join(rootDir, '.temp_processed'));
        fs.unlinkSync(path.join(rootDir, '.temp_processed'));

        spinner.text = `正在合并到目标文件...`;

        // 合并到现有文件
        let finalContent = existingTargetContent;

        // 如果目标文件不存在，从源文件开始
        if (!finalContent && command === 'encrypt') {
          finalContent = fs.readFileSync(sourceFile, 'utf8');
        } else if (!finalContent && command === 'decrypt') {
          // 解密模式下，如果目标文件不存在，创建空内容
          finalContent = '';
        }

        // 更新变更的变量
        const lines = finalContent.split('\n');
        const updatedLines = [];
        const processedKeys = new Set();

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex > 0) {
              const key = trimmedLine.substring(0, equalIndex).trim();
              if (key in processedChangesObj) {
                // 替换为处理后的值
                updatedLines.push(`${key}=${processedChangesObj[key]}`);
                processedKeys.add(key);
              } else {
                // 保持原有内容
                updatedLines.push(line);
              }
            } else {
              updatedLines.push(line);
            }
          } else {
            updatedLines.push(line);
          }
        }

        // 添加新增的变量
        for (const [key, value] of Object.entries(processedChangesObj)) {
          if (!processedKeys.has(key)) {
            updatedLines.push(`${key}=${value}`);
          }
        }

        // 处理删除的变量
        for (const key of Object.keys(originalChanges.removed)) {
          if (selectedChanges.includes(key)) {
            // 从文件中移除这些行
            const filteredLines = updatedLines.filter(line => {
              const trimmedLine = line.trim();
              if (trimmedLine && !trimmedLine.startsWith('#')) {
                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex > 0) {
                  const lineKey = trimmedLine.substring(0, equalIndex).trim();
                  return lineKey !== key;
                }
              }
              return true;
            });
            updatedLines.length = 0;
            updatedLines.push(...filteredLines);
          }
        }

        finalContent = updatedLines.join('\n');
        fs.writeFileSync(targetFile, finalContent);
      } else {
        // 只有删除操作
        spinner.text = `正在处理删除操作...`;

        let finalContent = existingTargetContent;
        if (!finalContent && fs.existsSync(sourceFile)) {
          finalContent = fs.readFileSync(sourceFile, 'utf8');
        }

        // 处理删除的变量
        const lines = finalContent.split('\n');
        const filteredLines = lines.filter(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex > 0) {
              const key = trimmedLine.substring(0, equalIndex).trim();
              return !selectedChanges.includes(key) || !(key in originalChanges.removed);
            }
          }
          return true;
        });

        finalContent = filteredLines.join('\n');
        fs.writeFileSync(targetFile, finalContent);
      }

      spinner.succeed(chalk.green(`✅ 成功${operationText}选择的 ${selectedChanges.length} 项变更到文件: ${path.basename(targetFile)}`));
    } else {
      // 原有的完整文件处理逻辑
      spinner = ora(`正在${operationText}文件...`).start();

      const cmd = command === 'encrypt'
        ? `npx @dotenvx/dotenvx encrypt -f ${sourceFile} --stdout`
        : `npx @dotenvx/dotenvx decrypt -f ${sourceFile} --stdout`;

      const result = execSync(cmd, {
        cwd: rootDir,
        env: envVars,
        encoding: 'utf8'
      });

      spinner.text = `正在写入${operationText}后的文件...`;
      fs.writeFileSync(targetFile, result);

      spinner.succeed(chalk.green(`✅ 成功${operationText}文件: ${path.basename(targetFile)}`));
    }

    return true;
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red(`❌ ${operationText}失败: ${error.message}`));
    }
    return false;
  }
};

// 增量更新逻辑
const performIncrementalUpdate = async (command, envFile, options = {}) => {
  const sourceFile = command === 'encrypt'
    ? path.join(rootDir, envFile)
    : path.join(rootDir, `${envFile}.dev.vault`);

  const targetFile = command === 'encrypt'
    ? path.join(rootDir, `${envFile}.dev.vault`)
    : path.join(rootDir, envFile);

  // 检查源文件是否存在
  if (!fs.existsSync(sourceFile)) {
    console.error(chalk.red(`❌ 文件 ${sourceFile} 不存在`));
    process.exit(1);
  }

  const analysisSpinner = ora('正在分析文件变更...').start();
  analysisSpinner.info(chalk.gray(`源文件: ${path.basename(sourceFile)}`));
  analysisSpinner.info(chalk.gray(`目标文件: ${path.basename(targetFile)}`));

  let oldEnv = {};
  let newEnv = {};

  if (command === 'encrypt') {
    // 加密模式：比较明文文件与解密后的加密文件
    analysisSpinner.text = '正在读取源文件...';
    newEnv = parseEnvFile(sourceFile);

    if (fs.existsSync(targetFile)) {
      // 临时解密现有的加密文件来比较
      analysisSpinner.text = '正在解密现有文件进行比较...';
      const privateKey = getPrivateKey(false); // 不显示消息，避免重复
      const tempDecryptFile = path.join(rootDir, '.temp_decrypt');

      try {
        const decryptCmd = `npx @dotenvx/dotenvx decrypt -f ${targetFile} --stdout`;
        const decryptedContent = execSync(decryptCmd, {
          cwd: rootDir,
          env: { DOTENV_PRIVATE_KEY: privateKey, ...process.env },
          encoding: 'utf8'
        });

        fs.writeFileSync(tempDecryptFile, decryptedContent);
        oldEnv = parseEnvFile(tempDecryptFile);
        fs.unlinkSync(tempDecryptFile); // 清理临时文件
      } catch (error) {
        analysisSpinner.warn(chalk.yellow(`⚠️  无法解密现有文件进行比较: ${error.message}`));
      }
    }
  } else {
    // 解密模式：比较加密文件解密后的内容与现有明文文件
    if (fs.existsSync(targetFile)) {
      analysisSpinner.text = '正在读取现有目标文件...';
      oldEnv = parseEnvFile(targetFile);
    }

    // 临时解密源文件来比较
    analysisSpinner.text = '正在解密源文件进行比较...';
    const privateKey = getPrivateKey(true); // 显示消息，因为这是第一次加载
    const tempDecryptFile = path.join(rootDir, '.temp_decrypt');

    try {
      const decryptCmd = `npx @dotenvx/dotenvx decrypt -f ${sourceFile} --stdout`;
      const decryptedContent = execSync(decryptCmd, {
        cwd: rootDir,
        env: { DOTENV_PRIVATE_KEY: privateKey, ...process.env },
        encoding: 'utf8'
      });

      fs.writeFileSync(tempDecryptFile, decryptedContent);
      newEnv = parseEnvFile(tempDecryptFile);
      fs.unlinkSync(tempDecryptFile); // 清理临时文件
    } catch (error) {
      analysisSpinner.fail(chalk.red(`❌ 无法解密源文件: ${error.message}`));
      process.exit(1);
    }
  }

  analysisSpinner.text = '正在比较文件差异...';
  await new Promise(resolve => setTimeout(resolve, 500)); // 模拟分析时间
  analysisSpinner.succeed(chalk.green('✅ 文件分析完成'));

  // 比较变更
  const changes = compareEnvObjects(oldEnv, newEnv);
  const { hasChanges, allChanges } = await displayChangeSummaryAndSelect(changes, options);

  if (!hasChanges) {
    console.log(chalk.green.bold('\n🎉 没有变更需要处理，操作完成！'));
    return;
  }

  let selectedChanges = [];

  // 询问用户确认和选择变更（除非使用强制模式）
  if (!options.force) {
    // 让用户选择要应用的变更
    selectedChanges = await selectChangesToApply(allChanges);

    if (selectedChanges.length === 0) {
      console.log(chalk.yellow('\n❌ 没有选择任何变更，操作已取消'));
      return;
    }

    // 显示选择的变更摘要
    const selectedCount = selectedChanges.length;
    const totalCount = allChanges.length;
    console.log(chalk.cyan(`\n📋 已选择 ${selectedCount}/${totalCount} 项变更`));

    const confirmed = await askConfirmation('确认应用选择的变更？');

    if (!confirmed) {
      console.log(chalk.yellow('\n❌ 操作已取消'));
      return;
    }
  } else {
    console.log(chalk.yellow('\n⚡ 强制模式：跳过确认，应用所有变更'));
    selectedChanges = allChanges.map(change => change.key);
  }

  // 创建备份（除非禁用备份）
  if (!options.noBackup && fs.existsSync(targetFile)) {
    const backupSpinner = ora('正在创建备份文件...').start();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${targetFile}.backup.${timestamp}`;

    try {
      fs.copyFileSync(targetFile, backupFile);
      backupSpinner.succeed(chalk.cyan(`💾 已创建备份文件: ${path.basename(backupFile)}`));
    } catch (error) {
      backupSpinner.fail(chalk.red(`❌ 备份创建失败: ${error.message}`));
    }
  } else if (options.noBackup) {
    console.log(chalk.yellow('⚠️  已跳过备份创建'));
  }

  // 执行操作
  const privateKey = getPrivateKey(false); // 不显示消息，避免重复
  const success = await executeOperation(
    command,
    sourceFile,
    targetFile,
    privateKey,
    selectedChanges,
    changes,
    oldEnv,
    newEnv
  );

  if (success) {
    console.log(chalk.green.bold('\n🎉 增量更新完成！'));

    // 显示最终统计
    const selectedCount = selectedChanges.length;
    const totalChanges = allChanges.length;

    if (selectedCount === totalChanges) {
      console.log(chalk.cyan(`📈 本次更新处理了所有 ${totalChanges} 项变更`));
    } else {
      console.log(chalk.cyan(`📈 本次更新处理了 ${selectedCount}/${totalChanges} 项变更`));
    }

    // 显示具体处理的变更
    const processedChanges = allChanges.filter(change => selectedChanges.includes(change.key));
    if (processedChanges.length > 0) {
      console.log(chalk.gray('\n处理的变更:'));
      processedChanges.forEach(change => {
        const icon = change.type === 'added' ? '➕' : change.type === 'modified' ? '🔄' : '❌';
        console.log(chalk.gray(`  ${icon} ${change.key}`));
      });
    }
  } else {
    console.log(chalk.red.bold('\n💥 更新失败，请检查错误信息'));
  }
};

// 主程序
const main = async () => {
  const program = new Command();

  program
    .name('encrypt-decrypt')
    .description(chalk.cyan.bold('env devtools'))
    .version('2.0.0');

  // 加密命令
  program
    .command('encrypt')
    .description('加密环境变量文件')
    .argument('[env-file]', '环境变量文件名', '.env')
    .option('-f, --force', '跳过确认提示，强制执行')
    .option('--no-backup', '不创建备份文件')
    .option('-q, --quiet', '静默模式，减少输出')
    .action(async (envFile, options) => {
      await executeCommand('encrypt', envFile, options);
    });

  // 解密命令
  program
    .command('decrypt')
    .description('解密环境变量文件')
    .argument('[env-file]', '环境变量文件名', '.env')
    .option('-f, --force', '跳过确认提示，强制执行')
    .option('--no-backup', '不创建备份文件')
    .option('-q, --quiet', '静默模式，减少输出')
    .action(async (envFile, options) => {
      await executeCommand('decrypt', envFile, options);
    });

  // 添加功能特性说明
  program.addHelpText('after', `
${chalk.cyan.bold('功能特性:')}
  ${chalk.green('✅')} 增量更新 - 只处理变更的字段
  ${chalk.green('✅')} 变更检测 - 显示新增、修改、删除的变量
  ${chalk.green('✅')} 确认提示 - 操作前显示变更摘要
  ${chalk.green('✅')} 自动备份 - 保护原有数据
  ${chalk.green('✅')} 进度显示 - 实时反馈操作状态
  ${chalk.green('✅')} 专业界面 - 更好的用户体验

${chalk.cyan.bold('示例:')}
  ${chalk.gray('$')} node encrypt-decrypt.js encrypt
  ${chalk.gray('$')} node encrypt-decrypt.js decrypt .env.production
  ${chalk.gray('$')} node encrypt-decrypt.js encrypt --force --no-backup
  ${chalk.gray('$')} node encrypt-decrypt.js decrypt --quiet
`);

  await program.parseAsync();
};

// 执行命令的通用函数
const executeCommand = async (command, envFile, options) => {
  // 设置静默模式
  if (options.quiet) {
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0] && typeof args[0] === 'string' &&
          (args[0].includes('✅') || args[0].includes('❌') || args[0].includes('🎉'))) {
        originalLog(...args);
      }
    };
  }

  console.log(chalk.cyan.bold(`\n🚀 启动${command === 'encrypt' ? '加密' : '解密'}操作`));
  console.log(chalk.gray(`📁 目标文件: ${envFile}`));

  if (options.force) {
    console.log(chalk.yellow('⚡ 强制模式已启用'));
  }

  if (!options.backup) {
    console.log(chalk.yellow('⚠️  备份已禁用'));
  }

  try {
    await performIncrementalUpdate(command, envFile, {
      force: options.force,
      noBackup: !options.backup,
      quiet: options.quiet
    });
  } catch (error) {
    console.error(chalk.red.bold(`💥 程序执行出错: ${error.message}`));
    process.exit(1);
  }
};

// 处理程序退出
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 程序被用户中断'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold(`💥 未捕获的异常: ${error.message}`));
  process.exit(1);
});

// 启动程序
main().catch((error) => {
  console.error(chalk.red.bold(`💥 程序启动失败: ${error.message}`));
  process.exit(1);
});