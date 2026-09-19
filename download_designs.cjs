const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'design_reference');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const screens = [
  { name: 'student_dashboard.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1UeNP69GQbW8EDjPz_gkzCDMrAKHzBr16lJu9IDch949L4ZFpwgzz5LmyTAmq8NoqT25prO8WVJTqYUyHCfXRBVBz5axijO_5lDNWLmM6H1rF2Puy4oJ8FAJ1XBliFiKwtEbDFDcuVxJBZ0cNmLjJdjg6iEbJhSWHMAwvnyO9pKKa-vTPTKhKTYtA4FvlUqXueoqzSQ1pVrxrLG18h-2y8ASrrl_EFft03NQCttkNErGNQ_egipbVo7eP83' },
  { name: 'ai_tutor.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1UUBbkfRCppxiu4F2ywk6FoCT4ATb-bSzQGPEZ5si-_nuMzGNT3vB5HI4Hic2dpZuSVz6JgjtMtC446QWZfWzGRE--26QNsd4LVZQcgVRv0KcmTKSKwzlV8Q-meOW23I_izt2d6YGwaQuVckTTuV6mNmSNp9KFq_5RSay6i3yIDcoIf6x8E8TohacabxvMSSLWEeRHWjqdowdrpeWQlPCA50D40aNCyvadPBPRIKD8U84_Qd2lrLQG02aw' },
  { name: 'teacher_create_assignment.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1X4RpIo2dk5brjZ0McmriU4q_lZtYkKZ2aglP4CwNryAZD67Dw3UVcO0i1RfzzjmtEUOAReO6-nh2Ae_c9cLZ2N610Iu77HD-Sxu_l4G-Aq7ISL_jWVz8FnMNak4IpDzVAJhHcMQFvyuYOUk0N2_zcxP35YjlBWyTSuQIVnosuRjWCAltKoaNXrjz3nPqXBAhaVs76jeA7rr78-l1JJBrKgIsf4ItLgOG-whbcQqZBsqUuumhbUfMkjAmQ' },
  { name: 'teacher_analytics.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1Vm285Xfn_eRwIncT56AYYrAyU_qrfEzMpF5-mEKTiBAVVeEyGHqCn9RAOpsVz54jJQP2yWjiYlntTZZBnyKAEgNlwpUZU2jLuObu9xgVkLmlDMxk5xO5QrVelHLLLZUoOnupoZ31MjfB0y3TGlBU8mvrzlrcb3K9vmkfz8WarNuOF6QuiHeecHlafhCRcF39ixn3qvhJuJxXJGLMkVSR8u6ByWGLNZ9ITOhsoYOAvrpN41pC8O0MvlSGzY' },
  { name: 'parent_dashboard.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1Ura4pAW42QJ1fUZnp2lGyUW8eom0TgOaRfIwdKLLjTzSNd_2Ew57uU_SxZU2vXG_KjoZTTevIzpU3--U7hP8m2xsD7XPmtho5JAPNWTtiD4CQjvDeXIn_YLGaEuBhuylJRKCc6WqZ2MtdnvtPxMYOGgoQSH0hnB87tkS7AScDYRGm_lZ6ZaApC2EG1rPvr5viSyKgg5ofr5-J5CxrW080Bz0WrRHAwqzTgEe65vs_2QkMt2_4aHUjB3xOI' },
  { name: 'admin_dashboard.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1X7KL8FrH_nxot-hmbV2KYinaaGKXFhFKxwSHqutHPVbD6hCZSS0e5j4mk6AiS5mZh56l74C-3X8NDhDnqecZqW7I_fUjpkLiZEqYbSSGxm6kxz_JtnDsSdNgKiNqzUpkLooKMWNKULq_q3dWX3Y5klhQCHguk5nu_eKwsS1Pjwi7qwaK1LSc1s2S_j7EasWHP0b484_saHYpztyliUo12DfcR5JRIvV_dM5jRuHU8V9tnD02Pnk3uKvX41' },
  { name: 'student_avatar.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1XuX9pU7a_hsfYlsTOdDTAGHf4BDbIPyNSdYPG31kuhLoI4OmRzXn_isfkLEPh8afpTH8hlYLm52H5hc55k-9BQqPxWI7xTSYx8RRtYXXDy3zMC0BzfDW2TC1JTtsVzCZ62I6XA33Mw5YWmfYTJ6c9aQdb6M1vZ6ZdrdWNBTmZj8HhqC9ijr55n13X7SytEmLsKH7AsGbBZCX34ltWk_vVV7T1J6-cC94x9ChHpx0tDXVBVtma4iPsIWcYN' },
  { name: 'school_interior.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1WBsaQPCFlyWL6kwUeho11Ju_3RInhjgJqflxHFJhhkLDDabxZ3qoUWixzZ71OKH4qHF36Gb2roH_pbMkaKLH5Zw6LlFm4JG0-Vd0MQtXzBFzteGt_H-_rHmqITO5sRsXkmFy4hthb3HBMAubWrNgcLCVwXtrdkqn7BUCyRg4XtxEhK9q5oTle80wUphQEZ8xxfvS7pt95YwMtIZRJl-GoTI9Pvr7Ynap8JEPpPtl5ra2yUdvNL0qpLG1I' },
  { name: 'logo.png', url: 'https://lh3.googleusercontent.com/aida/AEtjO1WiVuDBFDXAyARmO2qKzu0Y7T4bzp7WsODLkOaq5XHBAzUnrkx5h_KtKNotZg6MfPRy03zei9wRQIJQ6eurn0BM9LOHJn_5twqZM8oa2FKScU2monbePIOO8ZS_3UcetCRLwVqTDnEM6_oZnX_4WH61SjxagSVQAjymkB5weePa-XUaj2AriGC3V0T7CJXTRwRwuz3QLH9r77CULprJb-VWAfG2_TvccCTw0faV5kopNRPZfHvP_ddreQ1o' }
];

async function downloadAll() {
  for (const item of screens) {
    const filePath = path.join(dir, item.name);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      https.get(item.url, res => {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${item.name} (${fs.statSync(filePath).size} bytes)`);
          resolve();
        });
      }).on('error', err => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  }
}

downloadAll();
