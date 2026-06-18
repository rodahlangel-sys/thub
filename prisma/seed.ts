import bcrypt from "bcryptjs";
import { getSeedPasswords } from "../src/lib/seed-config";
import {
  CertificationStatus,
  DemandStatus,
  OrderStatus,
  PrismaClient,
  RefundStatus,
  TeachMode,
  UserRole,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const parentProfiles = [
  {
    email: "parent1@example.com",
    name: "李女士",
    phone: "13800010001",
    area: "洪山区",
    addressDetail: "光谷关山大道附近",
    childInfo: "初二学生，数学基础一般，希望提升解题速度。",
  },
  {
    email: "parent2@example.com",
    name: "王先生",
    phone: "13800010002",
    area: "武昌区",
    addressDetail: "中南路地铁站附近",
    childInfo: "高一学生，英语阅读和写作需要系统辅导。",
  },
  {
    email: "parent3@example.com",
    name: "陈女士",
    phone: "13800010003",
    area: "江汉区",
    addressDetail: "新华路万达附近",
    childInfo: "小学五年级，语文作文表达不够完整。",
  },
  {
    email: "parent4@example.com",
    name: "周先生",
    phone: "13800010004",
    area: "汉阳区",
    addressDetail: "钟家村商圈附近",
    childInfo: "初三学生，物理电学和力学薄弱。",
  },
  {
    email: "parent5@example.com",
    name: "赵女士",
    phone: "13800010005",
    area: "江岸区",
    addressDetail: "后湖大道附近",
    childInfo: "高二学生，想补化学并兼顾学习方法。",
  },
];

const tutorProfiles = [
  ["tutor1@example.com", "张同学", "13900020001", "武汉大学", "数学与应用数学", "大三", "女", "数学,物理", "初中,高中", "洪山区,武昌区", TeachMode.OFFLINE, "周二晚,周六下午", 120, 180, CertificationStatus.APPROVED, 4.9, 18],
  ["tutor2@example.com", "刘同学", "13900020002", "华中科技大学", "计算机科学与技术", "大四", "男", "编程,数学", "小学,初中,高中", "洪山区,青山区", TeachMode.BOTH, "周三晚,周日全天", 130, 220, CertificationStatus.APPROVED, 4.8, 22],
  ["tutor3@example.com", "黄同学", "13900020003", "华中师范大学", "英语", "研一", "女", "英语,英语口语", "小学,初中,高中", "武昌区,洪山区", TeachMode.BOTH, "周一晚,周六上午", 110, 180, CertificationStatus.APPROVED, 4.7, 16],
  ["tutor4@example.com", "吴同学", "13900020004", "武汉理工大学", "机械工程", "大三", "男", "物理,数学", "初中,高中", "洪山区,武昌区", TeachMode.OFFLINE, "周四晚,周日下午", 100, 160, CertificationStatus.PENDING, 4.5, 7],
  ["tutor5@example.com", "郑同学", "13900020005", "中南财经政法大学", "法学", "大二", "女", "语文,英语", "小学,初中", "江汉区,江岸区,硚口区", TeachMode.BOTH, "周五晚,周六晚", 90, 150, CertificationStatus.APPROVED, 4.6, 11],
  ["tutor6@example.com", "孙同学", "13900020006", "湖北大学", "化学", "大四", "女", "化学,数学", "初中,高中", "武昌区,青山区", TeachMode.OFFLINE, "周二晚,周日晚上", 100, 170, CertificationStatus.APPROVED, 4.9, 20],
  ["tutor7@example.com", "胡同学", "13900020007", "武汉大学", "汉语言文学", "大三", "女", "语文,英语", "小学,初中,高中", "武昌区,江汉区", TeachMode.ONLINE, "周一晚,周三晚", 100, 160, CertificationStatus.PENDING, 4.4, 5],
  ["tutor8@example.com", "朱同学", "13900020008", "华中科技大学", "电子信息工程", "大三", "男", "物理,编程", "初中,高中", "洪山区,青山区", TeachMode.BOTH, "周六上午,周日下午", 120, 200, CertificationStatus.APPROVED, 5.0, 25],
  ["tutor9@example.com", "高同学", "13900020009", "武汉理工大学", "材料科学", "大二", "男", "化学,物理", "初中,高中", "洪山区,汉阳区", TeachMode.OFFLINE, "周五晚,周日全天", 95, 150, CertificationStatus.REJECTED, 4.3, 3],
  ["tutor10@example.com", "林同学", "13900020010", "华中师范大学", "教育学", "研一", "女", "数学,英语", "小学,初中", "江岸区,江汉区", TeachMode.BOTH, "周三晚,周六下午", 110, 170, CertificationStatus.APPROVED, 4.8, 19],
  ["tutor11@example.com", "马同学", "13900020011", "中南财经政法大学", "金融学", "大三", "男", "数学,英语", "小学,初中,高中", "武昌区,洪山区", TeachMode.ONLINE, "周二晚,周四晚", 100, 180, CertificationStatus.PENDING, 4.5, 8],
  ["tutor12@example.com", "何同学", "13900020012", "湖北大学", "物理学", "大四", "男", "物理,数学", "初中,高中", "硚口区,汉阳区", TeachMode.OFFLINE, "周六晚,周日晚上", 105, 170, CertificationStatus.APPROVED, 4.7, 14],
  ["tutor13@example.com", "谢同学", "13900020013", "武汉大学", "软件工程", "大二", "女", "编程,数学", "小学,初中", "洪山区,武昌区", TeachMode.BOTH, "周六上午,周日全天", 120, 210, CertificationStatus.APPROVED, 4.9, 21],
  ["tutor14@example.com", "罗同学", "13900020014", "华中科技大学", "临床医学", "大五", "女", "化学,英语", "初中,高中", "江汉区,江岸区", TeachMode.BOTH, "周日晚,周三晚", 130, 220, CertificationStatus.APPROVED, 4.8, 17],
  ["tutor15@example.com", "唐同学", "13900020015", "武汉理工大学", "土木工程", "大三", "男", "数学,物理", "初中,高中", "汉阳区,硚口区", TeachMode.OFFLINE, "周五晚,周日下午", 95, 160, CertificationStatus.PENDING, 4.4, 6],
  ["tutor16@example.com", "曹同学", "13900020016", "华中师范大学", "心理学", "大四", "女", "英语口语,语文", "小学,初中", "江岸区,武昌区", TeachMode.ONLINE, "周一晚,周六晚", 90, 150, CertificationStatus.APPROVED, 4.6, 10],
  ["tutor17@example.com", "彭同学", "13900020017", "湖北大学", "英语", "大三", "男", "英语,英语口语", "小学,初中,高中", "青山区,洪山区", TeachMode.BOTH, "周三晚,周日全天", 100, 170, CertificationStatus.APPROVED, 4.7, 13],
  ["tutor18@example.com", "梁同学", "13900020018", "中南财经政法大学", "统计学", "大四", "女", "数学,编程", "初中,高中", "武昌区,江汉区", TeachMode.BOTH, "周二晚,周六下午", 115, 190, CertificationStatus.PENDING, 4.5, 9],
  ["tutor19@example.com", "宋同学", "13900020019", "武汉大学", "新闻传播学", "大二", "女", "语文,英语口语", "小学,初中", "江汉区,硚口区", TeachMode.ONLINE, "周四晚,周日晚上", 95, 155, CertificationStatus.REJECTED, 4.3, 2],
  ["tutor20@example.com", "袁同学", "13900020020", "华中科技大学", "自动化", "研一", "男", "物理,编程", "初中,高中", "洪山区,青山区,武昌区", TeachMode.BOTH, "周六全天,周日晚", 140, 240, CertificationStatus.APPROVED, 5.0, 28],
] as const;

const demandSeeds = [
  [0, "初二", "数学", "期末前把函数和几何专题补起来", "洪山区", TeachMode.OFFLINE, "周六下午", 120, 180, "孩子计算没问题，但综合题容易卡住，希望老师能带方法。", DemandStatus.OPEN],
  [1, "高一", "英语", "提升阅读理解和作文表达", "武昌区", TeachMode.BOTH, "周三晚或周日", 110, 180, "希望老师能布置少量课后练习并反馈。", DemandStatus.MATCHED],
  [2, "五年级", "语文", "作文结构和阅读概括训练", "江汉区", TeachMode.OFFLINE, "周五晚", 90, 140, "孩子表达欲强，但作文层次不清。", DemandStatus.OPEN],
  [3, "初三", "物理", "中考电学专题突破", "汉阳区", TeachMode.OFFLINE, "周日下午", 100, 170, "需要熟悉武汉中考题型的大学生家教。", DemandStatus.MATCHED],
  [4, "高二", "化学", "有机化学和实验题补弱", "江岸区", TeachMode.BOTH, "周二晚", 120, 200, "希望能先做一次诊断再安排计划。", DemandStatus.CLOSED],
  [0, "初一", "英语口语", "提升开口表达和听力反应", "洪山区", TeachMode.ONLINE, "周一晚", 80, 130, "孩子怕开口，需要耐心互动。", DemandStatus.OPEN],
  [1, "高三", "数学", "一轮复习查漏补缺", "武昌区", TeachMode.OFFLINE, "周六晚上", 150, 240, "重点做函数、导数和立体几何。", DemandStatus.MATCHED],
  [2, "六年级", "编程", "Scratch 到 Python 入门", "江汉区", TeachMode.ONLINE, "周日上午", 100, 180, "孩子对编程感兴趣，希望系统入门。", DemandStatus.OPEN],
  [3, "初二", "化学", "提前衔接初三化学", "硚口区", TeachMode.OFFLINE, "周日晚上", 100, 160, "希望讲得生动一些，建立兴趣。", DemandStatus.OPEN],
  [4, "高一", "物理", "运动学和受力分析", "青山区", TeachMode.BOTH, "周四晚", 110, 180, "基础概念不牢，需要配合练题。", DemandStatus.MATCHED],
  [0, "三年级", "语文", "阅读理解和看图写话", "洪山区", TeachMode.OFFLINE, "周六上午", 80, 120, "希望老师有小学陪伴式辅导经验。", DemandStatus.OPEN],
  [1, "初三", "英语", "中考听力和完形填空", "武昌区", TeachMode.ONLINE, "周二晚", 100, 160, "需要每周固定一次，持续到中考前。", DemandStatus.CLOSED],
  [2, "高二", "数学", "数列和圆锥曲线专项", "江岸区", TeachMode.BOTH, "周日晚", 130, 220, "希望老师能讲清解题思路。", DemandStatus.MATCHED],
  [3, "初一", "数学", "培养校内作业习惯", "汉阳区", TeachMode.OFFLINE, "周三晚", 90, 140, "孩子粗心，需要规范步骤。", DemandStatus.OPEN],
  [4, "高一", "英语口语", "英语演讲和日常表达", "硚口区", TeachMode.ONLINE, "周五晚", 100, 180, "希望老师英语发音清晰，能带情景练习。", DemandStatus.OPEN],
] as const;

const orderSeeds = [
  [0, 0, 0, "数学", OrderStatus.PENDING_TUTOR_CONFIRM, TeachMode.OFFLINE, "洪山区关山大道家中", 2, 150],
  [1, 2, 1, "英语", OrderStatus.PENDING_PAYMENT, TeachMode.BOTH, "武昌区中南路家中", 2, 150],
  [2, 4, 2, "语文", OrderStatus.ESCROWED, TeachMode.OFFLINE, "江汉区新华路家中", 1.5, 120],
  [3, 11, 3, "物理", OrderStatus.IN_PROGRESS, TeachMode.OFFLINE, "汉阳区钟家村家中", 2, 140],
  [4, 13, 4, "化学", OrderStatus.PENDING_PARENT_CONFIRM, TeachMode.BOTH, "线上腾讯会议", 2, 180],
  [0, 7, 6, "数学", OrderStatus.COMPLETED, TeachMode.OFFLINE, "洪山区光谷校区附近", 2, 180],
  [1, 9, 11, "英语", OrderStatus.COMPLETED, TeachMode.ONLINE, "线上课堂", 1.5, 140],
  [2, 12, 7, "编程", OrderStatus.COMPLETED, TeachMode.ONLINE, "线上课堂", 2, 180],
  [3, 14, 8, "化学", OrderStatus.REFUND_REQUESTED, TeachMode.OFFLINE, "硚口区古田附近", 2, 130],
  [4, 5, 9, "物理", OrderStatus.REFUNDED, TeachMode.BOTH, "青山区和平大道家中", 2, 160],
  [0, 15, 5, "英语口语", OrderStatus.CANCELLED, TeachMode.ONLINE, "线上课堂", 1, 120],
  [1, 19, 10, "语文", OrderStatus.ESCROWED, TeachMode.OFFLINE, "武昌区水果湖附近", 2, 150],
  [2, 17, 12, "数学", OrderStatus.PENDING_PAYMENT, TeachMode.BOTH, "江岸区后湖附近", 2, 170],
  [3, 3, 13, "数学", OrderStatus.COMPLETED, TeachMode.OFFLINE, "汉阳区钟家村家中", 1.5, 130],
  [4, 16, 14, "英语口语", OrderStatus.PENDING_TUTOR_CONFIRM, TeachMode.ONLINE, "线上课堂", 1.5, 130],
] as const;

async function main() {
  const { adminPassword, demoPassword } = getSeedPasswords(process.env);
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const commonPasswordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.review.deleteMany();
  await prisma.lessonFeedback.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.demand.deleteMany();
  await prisma.tutorProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      name: "平台管理员",
      phone: "13800000000",
      status: UserStatus.ACTIVE,
    },
  });

  const parents = [];
  for (const parent of parentProfiles) {
    parents.push(
      await prisma.user.create({
        data: {
          email: parent.email,
          passwordHash: commonPasswordHash,
          role: UserRole.PARENT,
          name: parent.name,
          phone: parent.phone,
          status: UserStatus.ACTIVE,
          parentProfile: {
            create: {
              area: parent.area,
              addressDetail: parent.addressDetail,
              childInfo: parent.childInfo,
            },
          },
        },
      }),
    );
  }

  const tutors = [];
  for (const tutor of tutorProfiles) {
    const [
      email,
      name,
      phone,
      school,
      major,
      grade,
      gender,
      subjects,
      teachLevels,
      areas,
      teachMode,
      availableTimes,
      priceMin,
      priceMax,
      certificationStatus,
      rating,
      orderCount,
    ] = tutor;

    tutors.push(
      await prisma.user.create({
        data: {
          email,
          passwordHash: commonPasswordHash,
          role: UserRole.TUTOR,
          name,
          phone,
          status: UserStatus.ACTIVE,
          tutorProfile: {
            create: {
              school,
              major,
              grade,
              gender,
              subjects,
              teachLevels,
              areas,
              teachMode,
              availableTimes,
              priceMin,
              priceMax,
              introduction: `${school}${major}${grade}学生，擅长${subjects}，能够根据学生基础制定阶段计划。`,
              experience: `累计服务 ${orderCount} 单，熟悉武汉本地学生课内同步和专题提升需求。`,
              certificationStatus,
              certificationNote:
                certificationStatus === CertificationStatus.REJECTED
                  ? "学生证照片不清晰，需重新提交。"
                  : certificationStatus === CertificationStatus.PENDING
                    ? "资料已提交，等待管理员审核。"
                    : "高校身份与基础资料已通过审核。",
              rating,
              orderCount,
            },
          },
        },
      }),
    );
  }

  const demands = [];
  for (const seed of demandSeeds) {
    const [
      parentIndex,
      childGrade,
      subject,
      goal,
      area,
      teachMode,
      expectedTime,
      budgetMin,
      budgetMax,
      description,
      status,
    ] = seed;

    demands.push(
      await prisma.demand.create({
        data: {
          parentId: parents[parentIndex].id,
          childGrade,
          subject,
          goal,
          area,
          teachMode,
          expectedTime,
          budgetMin,
          budgetMax,
          description,
          status,
        },
      }),
    );
  }

  const orders = [];
  for (const [index, seed] of orderSeeds.entries()) {
    const [
      parentIndex,
      tutorIndex,
      demandIndex,
      subject,
      status,
      teachMode,
      location,
      hours,
      hourlyPrice,
    ] = seed;
    const totalAmount = Math.round(hours * hourlyPrice * 100);
    const platformFeeRateBps = 500;
    const platformFeeAmountFen = Math.round(
      (totalAmount * platformFeeRateBps) / 10_000,
    );
    const tutorNetAmountFen = totalAmount - platformFeeAmountFen;
    const serviceFee = platformFeeAmountFen;

    orders.push(
      await prisma.order.create({
        data: {
          parentId: parents[parentIndex].id,
          tutorId: tutors[tutorIndex].id,
          demandId: demands[demandIndex].id,
          subject,
          scheduledTime: new Date(Date.now() + (index - 5) * 24 * 60 * 60 * 1000),
          teachMode,
          location,
          hours,
          hourlyPrice: hourlyPrice * 100,
          totalAmount,
          serviceFee,
          platformFeeRateBps,
          platformFeeAmountFen,
          tutorNetAmountFen,
          status,
        },
      }),
    );
  }

  for (const [index, order] of orders.entries()) {
    if (
      order.status !== OrderStatus.PENDING_TUTOR_CONFIRM &&
      order.status !== OrderStatus.CANCELLED
    ) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          provider: index % 3 === 0 ? "MOCK" : index % 3 === 1 ? "ALIPAY" : "WECHAT",
          status:
            order.status === OrderStatus.PENDING_PAYMENT
              ? "UNPAID"
              : order.status === OrderStatus.REFUNDED
                ? "REFUNDED"
                : "PAID",
          transactionNo:
            order.status === OrderStatus.PENDING_PAYMENT
              ? null
              : `MOCK-${String(index + 1).padStart(4, "0")}`,
          paidAt:
            order.status === OrderStatus.PENDING_PAYMENT
              ? null
              : new Date(Date.now() - (index + 1) * 60 * 60 * 1000),
        },
      });
    }
  }

  const completedOrderIndexes = [5, 6, 7, 13];
  for (const [feedbackIndex, orderIndex] of completedOrderIndexes.entries()) {
    const order = orders[orderIndex];

    await prisma.lessonFeedback.create({
      data: {
        orderId: order.id,
        tutorId: order.tutorId,
        content: "本次课程完成了错题复盘和一个专题讲解，学生能跟上节奏。",
        studentPerformance:
          feedbackIndex % 2 === 0
            ? "课堂参与度高，能主动提问。"
            : "基础掌握较好，但做题速度还需要继续提升。",
        problems:
          feedbackIndex % 2 === 0
            ? "综合题审题容易遗漏条件。"
            : "部分知识点会做但表达不够规范。",
        nextSuggestion: "建议下次课先用 15 分钟复盘作业，再进入新专题。",
      },
    });

    await prisma.review.create({
      data: {
        orderId: order.id,
        parentId: order.parentId,
        tutorId: order.tutorId,
        scorePunctuality: 5,
        scoreClarity: feedbackIndex === 1 ? 4 : 5,
        scoreCommunication: 5,
        scoreAcceptance: feedbackIndex === 2 ? 4 : 5,
        overallScore: feedbackIndex === 1 ? 4.7 : feedbackIndex === 2 ? 4.8 : 5,
        comment:
          feedbackIndex === 1
            ? "老师沟通很及时，讲解清楚，孩子愿意继续上课。"
            : "课程安排有条理，课后反馈具体，对孩子很有帮助。",
      },
    });
  }

  await prisma.refund.create({
    data: {
      orderId: orders[8].id,
      applicantId: orders[8].parentId,
      reason: "临时时间冲突",
      description: "家长临时出差，希望取消本次课程并退回担保金额。",
      refundAmount: orders[8].totalAmount,
      status: RefundStatus.PENDING,
      adminNote: null,
    },
  });

  await prisma.refund.create({
    data: {
      orderId: orders[9].id,
      applicantId: orders[9].parentId,
      reason: "老师无法按约定时间上课",
      description: "双方协商后同意退款，平台记录退款流程。",
      refundAmount: orders[9].totalAmount,
      status: RefundStatus.APPROVED,
      adminNote: "已核实双方沟通记录，同意退款。",
    },
  });

  const counts = {
    users: await prisma.user.count(),
    parents: await prisma.user.count({ where: { role: UserRole.PARENT } }),
    tutors: await prisma.user.count({ where: { role: UserRole.TUTOR } }),
    demands: await prisma.demand.count(),
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    feedbacks: await prisma.lessonFeedback.count(),
    reviews: await prisma.review.count(),
  };

  console.log("Seed completed:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
