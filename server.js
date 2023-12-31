const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");


require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://127.0.0.1:5173',
  'https://smartfinsoluction-backend.vercel.app',
  'https://smartfin-soluction.vercel.app',
  'https://smartfin-soluction-git-feature-home-fileroxx.vercel.app/',
  'https://smartfin-soluction-git-feature-home-fileroxx.vercel.app/login'
];

// Aplicar as opções de configuração do CORS
app.use(cors({
  origin: allowedOrigins, // Permite todas as origens
  methods: "GET,PUT,POST,DELETE", // Permite os métodos HTTP necessários
  allowedHeaders: "Content-Type,Authorization", // Permite os cabeçalhos necessários
}));

app.use(express.json());
app.use(cookieParser());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados: " + err.stack);
    return;
  }
  console.log("Conexão bem-sucedida ao banco de dados");
});


app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  const verificationToken = generateRandomHexCode(6); // Gera um código hexadecimal de 6 caracteres

  const sql = "INSERT INTO login (name, email, password, verification_token) VALUES (?, ?, ?, ?)";
  const values = [name, email, password, verificationToken];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.json("Error");
    }

    if (result.affectedRows > 0) {
      // Enviar o email de verificação aqui
      const verificationLink = `https://smartfin-soluction.vercel.app/verify/${verificationToken}`;
      const mailOptions = {
        from: "seu_email@gmail.com",
        to: email,
        subject: "Verificação de Email",
        html: `<p>Olá! Clique <a href="${verificationLink}">aqui</a> para verificar seu email.</p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Erro ao enviar o email de verificação: " + error);
          return res.status(500).json({ message: "Erro ao enviar o email de verificação" });
        }

        return res.json("Success");
      });
    } else {
      return res.json("Failed");
    }
  });
});

function generateRandomHexCode(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}


app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM login WHERE email = ? AND password = ?";
  const values = [email, password];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    if (result.length === 0) {
      return res.status(401).json("Credenciais inválidas");
    }

    const user = result[0];
    const token = jwt.sign(
      { name: user.name, userId: user.id, email: user.email },
      "chave-secreta",
      { expiresIn: "1h" }
    );

    return res.json({ token });
  });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json("Token não fornecido");
  }

  jwt.verify(token, "chave-secreta", (err, user) => {
    if (err) {
      return res.status(403).json("Token inválido");
    }

    req.user = user;
    next();
  });
};

app.put('/reset-password/:recoveryToken', (req, res) => {
  const recoveryToken = req.params.recoveryToken;
  const newPassword = req.body.newPassword;

  const selectSql = "SELECT * FROM login WHERE recovery_token = ?";
  db.query(selectSql, [recoveryToken], (selectErr, selectResult) => {
    if (selectErr) {
      console.error("Erro ao executar a consulta: " + selectErr.stack);
      return res.status(500).json("Erro ao trocar a senha");
    }

    if (selectResult.length === 0) {
      return res.status(404).json("Token de recuperação inválido");
    }

    const user = selectResult[0];
    const userId = user.id;

    const updateSql = "UPDATE login SET password = ?, recovery_token = NULL WHERE id = ?";
    db.query(updateSql, [newPassword, userId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Erro ao executar a consulta: " + updateErr.stack);
        return res.status(500).json("Erro ao trocar a senha");
      }

      if (updateResult.affectedRows > 0) {
        return res.json("Senha trocada com sucesso");
      } else {
        return res.status(500).json("Erro ao trocar a senha");
      }
    });
  });
});

app.get("/users", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM login";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    return res.json(result);
  });
});

app.get("/users/all", (req, res) => {
  const sql = "SELECT * FROM login";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    return res.json(result);
  });
});

app.get("/user/:token", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    // Verificar se o token é válido e não expirado, se necessário

    // Recuperar as informações do usuário do payload do token
    const userId = decodedToken.userId;
    const name = decodedToken.name;
    const email = decodedToken.email;

    // Use as informações do usuário para fazer a consulta no banco de dados ou realizar outras ações necessárias

    const user = {
      userId,
      name,
      email
    };

    return res.json(user);
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.post("/user/:token/ativo", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { nomeAtivo, quantidadeAtivos, valorAtivo } = req.body;

    const sql = "INSERT INTO ativos (nomeAtivo, quantidadeAtivos, valorAtivo, userId) VALUES (?, ?, ?, ?)";
    const values = [nomeAtivo, quantidadeAtivos, valorAtivo, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro");
      }

      if (result.affectedRows > 0) {
        return res.json("Sucesso");
      } else {
        return res.json("Falha");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.get("/user/:token/ativo", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "SELECT * FROM ativos WHERE userId = ?";
    const values = [userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Error");
      }

      // Mapear os resultados do banco de dados para um formato desejado (opcional)
      const ativos = result.map((row) => ({
        id: row.id,
        nomeAtivo: row.nomeAtivo,
        quantidadeAtivos: row.quantidadeAtivos,
        valorAtivo: row.valorAtivo,
      }));

      return res.json(ativos);
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.delete("/user/:token/ativo/:id", (req, res) => {
  const token = req.params.token;
  const ativoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "DELETE FROM ativos WHERE id = ? AND userId = ?";
    const values = [ativoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro");
      }

      if (result.affectedRows > 0) {
        return res.json("Sucesso");
      } else {
        return res.json("Falha");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.put("/user/:token/ativo/:id", (req, res) => {
  const token = req.params.token;
  const ativoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { nomeAtivo, quantidadeAtivos, valorAtivo } = req.body;

    const sql = "UPDATE ativos SET nomeAtivo = ?, quantidadeAtivos = ?, valorAtivo = ? WHERE id = ? AND userId = ?";
    const values = [nomeAtivo, quantidadeAtivos, valorAtivo, ativoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro");
      }

      if (result.affectedRows > 0) {
        return res.json("Sucesso");
      } else {
        return res.json("Falha");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});



app.get("/alerta", (req, res) => {
  const userId = req.user.userId;

  const sql = "SELECT * FROM alertas WHERE userId = ?";
  const values = [userId];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Erro ao obter os alertas");
    }

    // Mapear os resultados do banco de dados para um formato desejado (opcional)
    const alertas = result.map((row) => ({
      id: row.id,
      ativo: row.ativo,
      gatilho: row.gatilho,
      precoAlvo: row.precoAlvo,
    }));

    return res.json(alertas);
  });
});

app.post("/alerta", (req, res) => {
  const { ativo, gatilho, precoAlvo } = req.body;
  const userId = req.user.userId;

  const sql = "INSERT INTO alertas (userId, ativo, gatilho, precoAlvo) VALUES (?, ?, ?, ?)";
  const values = [userId, ativo, gatilho, precoAlvo];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Erro ao criar o alerta");
    }

    if (result.affectedRows > 0) {
      return res.json("Alerta criado com sucesso");
    } else {
      return res.json("Falha ao criar o alerta");
    }
  });
});


// POST (Criar um novo gasto)
app.post("/user/:token/gastos", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { categoria, valor } = req.body;

    const sql = "INSERT INTO gastos (userId, categoria, valor) VALUES (?, ?, ?)";
    const values = [userId, categoria, valor];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao criar o gasto");
      }

      if (result.affectedRows > 0) {
        return res.json("Gasto criado com sucesso");
      } else {
        return res.json("Falha ao criar o gasto");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.get("/user/:token/gastos", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "SELECT * FROM gastos WHERE userId = ?";
    const values = [userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao obter os gastos");
      }

      // Mapear os resultados do banco de dados para um formato desejado (opcional)
      const gastos = result.map((row) => ({
        id: row.id,
        categoria: row.categoria,
        valor: row.valor,
        dataCriacao: row.dataCriacao,
        dataAtualizacao: row.dataAtualizacao,
      }));

      return res.json(gastos);
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.put("/user/:token/gastos/:id", (req, res) => {
  const token = req.params.token;
  const gastoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { categoria, valor } = req.body;

    const sql = "UPDATE gastos SET categoria = ?, valor = ? WHERE id = ? AND userId = ?";
    const values = [categoria, valor, gastoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao atualizar o gasto");
      }

      if (result.affectedRows > 0) {
        return res.json("Gasto atualizado com sucesso");
      } else {
        return res.json("Falha ao atualizar o gasto");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.delete("/user/:token/gastos/:id", (req, res) => {
  const token = req.params.token;
  const gastoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "DELETE FROM gastos WHERE id = ? AND userId = ?";
    const values = [gastoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao excluir o gasto");
      }

      if (result.affectedRows > 0) {
        return res.json("Gasto excluído com sucesso");
      } else {
        return res.json("Falha ao excluir o gasto");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});



app.post("/user/:token/renda", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { valor } = req.body;

    const sql = "INSERT INTO renda (user_id, valor) VALUES (?, ?)";
    const values = [userId, valor];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao adicionar renda");
      }

      return res.json("Renda adicionada com sucesso");
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.get("/user/:token/renda", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");
    const userId = decodedToken.userId;

    const sql = "SELECT * FROM renda WHERE user_id = ?";
    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao buscar renda");
      }

      const rendas = result;
      return res.json(rendas);
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.put("/user/:token/renda/:rendaId", (req, res) => {
  const token = req.params.token;
  const rendaId = req.params.rendaId;
  const { valor, data } = req.body;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");
    const userId = decodedToken.userId;

    const sql = "UPDATE renda SET valor = ?, data = ? WHERE id = ? AND user_id = ?";
    const values = [valor, data, rendaId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao atualizar renda");
      }

      return res.json("Renda atualizada com sucesso");
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.delete("/user/:token/renda/:rendaId", (req, res) => {
  const token = req.params.token;
  const rendaId = req.params.rendaId;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");
    const userId = decodedToken.userId;

    const sql = "DELETE FROM renda WHERE id = ? AND user_id = ?";
    const values = [rendaId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao deletar renda");
      }

      return res.json("Renda deletada com sucesso");
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

// Configurar o transporter do nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "igor.fernandescesari@gmail.com",
    pass: "hffvfwoyywrzlspx"
  }
});


// Rota para recuperar a senha 

app.post('/recover-password', (req, res) => {
  const { email } = req.body;

  const sql = "SELECT * FROM login WHERE email = ?";
  const values = [email];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    if (result.length === 0) {
      return res.status(404).json("Email não encontrado");
    }

    const recoveryToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const updateSql = "UPDATE login SET recovery_token = ? WHERE email = ?";
    const updateValues = [recoveryToken, email];

    db.query(updateSql, updateValues, (err, updateResult) => {
      if (err) {
        console.error("Erro ao atualizar o token de recuperação: " + err.stack);
        return res.status(500).json("Error");
      }

      const mailOptions = {
        from: 'seu_email@gmail.com',
        to: email,
        subject: 'Recuperação de Senha',
        html: `<p>Olá! Você solicitou a recuperação de senha. Clique <a href="https://smartfin-soluction.vercel.app/esqueci/nova-senha/${recoveryToken}">aqui</a> para redefinir sua senha.</p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Erro ao enviar o email de recuperação: " + error);
          return res.status(500).json({ message: "Erro ao enviar o email de recuperação" });
        }

        return res.status(200).json({ message: "Email de recuperação enviado com sucesso", recoveryToken });
      });
    });
  });
});

app.post("/user/:token/sugestoes", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { sugestao } = req.body;

    const sql = "INSERT INTO sugestoes (userId, sugestao) VALUES (?, ?)";
    const values = [userId, sugestao];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao criar a sugestão técnica");
      }

      if (result.affectedRows > 0) {
        return res.json("Sugestão técnica criada com sucesso");
      } else {
        return res.json("Falha ao criar a sugestão técnica");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.get("/user/:token/sugestoes", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "SELECT * FROM sugestoes WHERE userId = ?";
    const values = [userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao obter as sugestões técnicas");
      }

      // Mapear os resultados do banco de dados para um formato desejado (opcional)
      const sugestoes = result.map((row) => ({
        id: row.id,
        sugestao: row.sugestao,
        dataCriacao: row.dataCriacao,
      }));

      return res.json(sugestoes);
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

app.put("/user/:token/sugestoes/:id", (req, res) => {
  const token = req.params.token;
  const sugestaoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { sugestao } = req.body;

    const sql = "UPDATE sugestoes SET sugestao = ? WHERE id = ? AND userId = ?";
    const values = [sugestao, sugestaoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao atualizar a sugestão técnica");
      }

      if (result.affectedRows > 0) {
        return res.json("Sugestão técnica atualizada com sucesso");
      } else {
        return res.json("Falha ao atualizar a sugestão técnica");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.delete("/user/:token/sugestoes/:id", (req, res) => {
  const token = req.params.token;
  const sugestaoId = req.params.id;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "DELETE FROM sugestoes WHERE id = ? AND userId = ?";
    const values = [sugestaoId, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Erro ao excluir a sugestão técnica");
      }

      if (result.affectedRows > 0) {
        return res.json("Sugestão técnica excluída com sucesso");
      } else {
        return res.json("Falha ao excluir a sugestão técnica");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
