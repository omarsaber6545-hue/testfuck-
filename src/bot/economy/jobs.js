const fs = require('fs');
const path = require('path');
const db = require('../../database/db');
const { createCard, createRow, createSelectMenu, COLORS, successCard, errorCard } = require('../utils/components');

function getJobsConfig() {
  const filePath = path.join(__dirname, '../../../data/jobs_config.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading jobs_config.json:', err);
  }
  return [];
}

async function handleJobs(message, args = []) {
  const jobs = getJobsConfig();
  const user = db.getUser(message.guild.id, message.author.id);
  const currentJob = jobs.find(j => j.id === user.job);

  // If user passed a specific job ID as argument: `وظيفة شراء <id>` or `وظيفة تقديم <id>`
  const action = (args[0] || '').toLowerCase();
  const targetJobId = (args[1] || '').toLowerCase();

  if ((action === 'شراء' || action === 'تقديم' || action === 'تعيين') && targetJobId) {
    const job = jobs.find(j => j.id === targetJobId || j.name.includes(targetJobId));
    if (!job) {
      return message.reply({ embeds: [errorCard('وظيفة غير موجودة', 'لم يتم العثور على الوظيفة المطلوبة. اكتب `وظائف` لعرض قائمة الوظائف المتاحة.')] });
    }
    return applyJob(message, user, job);
  }

  // Display job catalog
  const fields = jobs.map(j => {
    const isCurrent = user.job === j.id;
    const canAfford = (user.gold || 0) >= j.priceGold;
    const statusTag = isCurrent ? '[وظيفتك الحالية]' : canAfford ? '[متاح للشراء بالذهب]' : '[ذهب غير كافٍ]';

    return {
      name: `${j.name} ${statusTag}`,
      value: `• الوصف: ${j.description}\n• سعر التقديم: **${j.priceGold} 🪙 ذهب** | المستوى المطلوب: **${j.reqLevel}**\n• الراتب لكل نوبة: **${j.salaryCashMin.toLocaleString()} - ${j.salaryCashMax.toLocaleString()} 💵** + **${j.salaryGold} 🪙 ذهب**\n• مهلة العمل: كل **${j.cooldownMinutes} دقيقة**\n• أمر التعيين: \`وظيفة تعيين ${j.id}\``,
      inline: false
    };
  });

  const embed = createCard({
    title: 'مركز الوظائف والتوظيف (الشراء بالذهب)',
    description: `رصيدك الحالي: **${(user.gold || 0).toLocaleString()} 🪙 ذهب** | وظيفتك الحالية: **${currentJob ? currentJob.name : 'عاطل عن العمل'}**\nيمكنك شراء أي وظيفة بالذهب للبدء باستلام رواتب مجزية بالكاش والذهب عبر أمر \`راتب\`.\n\nاختر من القائمة أدناه أو اكتب: \`وظيفة تعيين <معرف_الوظيفة>\``,
    color: COLORS.gold,
    fields,
    footer: 'نظام التوظيف البنكي المتطور'
  });

  const selectOptions = jobs.map(j => ({
    label: j.name,
    description: `سعر: ${j.priceGold} ذهب | راتب: ${j.salaryGold} ذهب + ${j.salaryCashMin}-${j.salaryCashMax} كاش`,
    value: `job_select_${j.id}`,
    default: user.job === j.id
  }));

  const row = createRow(
    createSelectMenu({
      customId: 'job_apply_select_menu',
      placeholder: 'اختر الوظيفة التي تريد التعيين بها...',
      options: selectOptions
    })
  );

  return message.reply({ embeds: [embed], components: [row] });
}

function applyJob(messageOrInteraction, user, job) {
  const isInteraction = !messageOrInteraction.reply.length || messageOrInteraction.isStringSelectMenu?.();
  const userId = isInteraction ? messageOrInteraction.user.id : messageOrInteraction.author.id;
  const guildId = messageOrInteraction.guild.id;

  if (user.job === job.id) {
    const embed = errorCard('أنت معين بالفعل', `أنت تعمل بالفعل بوظيفة **${job.name}**.`);
    return isInteraction ? messageOrInteraction.reply({ embeds: [embed], ephemeral: true }) : messageOrInteraction.reply({ embeds: [embed] });
  }

  if ((user.level || 1) < job.reqLevel) {
    const embed = errorCard('مستوى غير كافٍ', `تحتاج إلى الوصول للمستوى **${job.reqLevel}** للتقديم على هذه الوظيفة (مستواك الحالي: ${user.level || 1}).`);
    return isInteraction ? messageOrInteraction.reply({ embeds: [embed], ephemeral: true }) : messageOrInteraction.reply({ embeds: [embed] });
  }

  if ((user.gold || 0) < job.priceGold) {
    const embed = errorCard('رصيد ذهب غير كافٍ', `سعر تعيين هذه الوظيفة هو **${job.priceGold} 🪙 ذهب**، بينما رصيدك الحالي هو **${(user.gold || 0).toLocaleString()} 🪙 ذهب**.\nاجمع الذهب من خلال الألعاب مثل \`خمن\` و \`سلوت\`!`);
    return isInteraction ? messageOrInteraction.reply({ embeds: [embed], ephemeral: true }) : messageOrInteraction.reply({ embeds: [embed] });
  }

  // Deduct gold and assign job
  user.gold -= job.priceGold;
  user.job = job.id;
  db.updateUser(guildId, userId, user);

  const embed = successCard(
    'تم التعيين بنجاح',
    `تهانينا! تم تعيينك رسمياً في وظيفة **${job.name}** مقابل **${job.priceGold} 🪙 ذهب**.\n\n• راتبك لكل عمل: **${job.salaryCashMin.toLocaleString()} - ${job.salaryCashMax.toLocaleString()} 💵** + **${job.salaryGold} 🪙 ذهب**.\n• يمكنك استلام الراتب عبر أمر: \`راتب\`.`
  );

  return isInteraction ? messageOrInteraction.reply({ embeds: [embed], ephemeral: true }) : messageOrInteraction.reply({ embeds: [embed] });
}

module.exports = {
  handleJobs,
  applyJob,
  getJobsConfig
};
