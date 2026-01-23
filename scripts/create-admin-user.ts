/**
 * 管理ユーザー作成スクリプト
 * 数字IDとパスワードでログインできる管理ユーザーを作成します
 * 
 * 使用方法:
 * npm run create:admin-user -- --userId 123456 --password AdminPass123 --name "管理者" --role SiteAdmin
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

// ランダムな数字IDを生成（6桁）
function generateUserId(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// ランダムなパスワードを生成（半角英数12文字）
function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  const args = process.argv.slice(2);
  
  let userId: string | undefined;
  let password: string | undefined;
  let name: string = "管理者";
  let role: string = "SiteAdmin";
  let email: string = "";

  // コマンドライン引数の解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--userId" && args[i + 1]) {
      userId = args[i + 1];
      i++;
    } else if (args[i] === "--password" && args[i + 1]) {
      password = args[i + 1];
      i++;
    } else if (args[i] === "--name" && args[i + 1]) {
      name = args[i + 1];
      i++;
    } else if (args[i] === "--role" && args[i + 1]) {
      role = args[i + 1];
      i++;
    } else if (args[i] === "--email" && args[i + 1]) {
      email = args[i + 1];
      i++;
    }
  }

  // userIdが指定されていない場合は自動生成
  if (!userId) {
    userId = generateUserId();
    console.log(`数字IDが指定されていないため、自動生成します: ${userId}`);
  }

  // 数字のみかチェック
  if (!/^\d+$/.test(userId)) {
    console.error("エラー: userIdは数字のみである必要があります");
    process.exit(1);
  }

  // 既存のユーザーIDをチェック
  const existingUser = await prisma.user.findUnique({
    where: { userId },
  });

  if (existingUser) {
    console.error(`エラー: 数字ID "${userId}" は既に使用されています`);
    process.exit(1);
  }

  // passwordが指定されていない場合は自動生成
  if (!password) {
    password = generatePassword();
    console.log(`パスワードが指定されていないため、自動生成します`);
  }

  // 半角英数のみかチェック
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    console.error("エラー: パスワードは半角英数のみである必要があります");
    process.exit(1);
  }

  // emailが指定されていない場合は自動生成
  if (!email) {
    email = `admin-${userId}@example.com`;
  }

  // パスワードをハッシュ化
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        userId,
        email,
        passwordHash,
        name,
        role,
      },
    });

    console.log("\n管理ユーザーを作成しました！");
    console.log("==========================================");
    console.log(`数字ID: ${userId}`);
    console.log(`パスワード: ${password}`);
    console.log(`名前: ${name}`);
    console.log(`権限: ${role}`);
    console.log(`メールアドレス: ${email}`);
    console.log("==========================================");
    console.log("\n重要: パスワードはこの画面にのみ表示されます。");
    console.log("必ずメモを取るか、安全な場所に保存してください。");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

