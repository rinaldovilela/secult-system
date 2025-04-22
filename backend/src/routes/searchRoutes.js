const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      type,
      query,
      startDate,
      endDate,
      pendingPayments,
      page = 1,
      limit = 15,
    } = req.query;

    // Converter page e limit para números e calcular o offset
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let results = [];
    let total = 0;

    // Converter pendingPayments para booleano
    const filterPendingPayments = pendingPayments === "true";

    // Buscar eventos
    if (type === "all" || type === "events") {
      let eventQuery = `
        SELECT DISTINCT e.id, e.title, e.date
        FROM events e
      `;
      let countQuery = `
        SELECT COUNT(DISTINCT e.id) as total
        FROM events e
      `;
      const queryParams = [];
      const countParams = [];

      // Adicionar JOIN com event_artists se o filtro de pagamentos pendentes estiver ativo
      if (filterPendingPayments) {
        eventQuery += `
          INNER JOIN event_artists ea ON e.id = ea.event_id
          WHERE ea.is_paid = 0
        `;
        countQuery += `
          INNER JOIN event_artists ea ON e.id = ea.event_id
          WHERE ea.is_paid = 0
        `;
      } else {
        eventQuery += " WHERE 1=1";
        countQuery += " WHERE 1=1";
      }

      // Filtrar por data a partir do dia atual se query estiver vazio
      if (!query) {
        eventQuery += " AND e.date >= CURDATE()";
        countQuery += " AND e.date >= CURDATE()";
      } else {
        // Filtrar por título se query for fornecido
        eventQuery += " AND e.title LIKE ?";
        countQuery += " AND e.title LIKE ?";
        queryParams.push(`%${query}%`);
        countParams.push(`%${query}%`);
      }

      // Filtrar por intervalo de datas, se fornecido
      if (startDate) {
        eventQuery += " AND e.date >= ?";
        countQuery += " AND e.date >= ?";
        queryParams.push(startDate);
        countParams.push(startDate);
      }
      if (endDate) {
        eventQuery += " AND e.date <= ?";
        countQuery += " AND e.date <= ?";
        // Ajustar endDate para incluir o dia inteiro (23:59:59)
        queryParams.push(`${endDate} 23:59:59`);
        countParams.push(`${endDate} 23:59:59`);
      }

      // Adicionar LIMIT e OFFSET para paginação
      eventQuery += ` LIMIT ? OFFSET ?`;
      queryParams.push(limitNum, offset);

      const [events] = await db.query(eventQuery, queryParams);
      const [[{ total: eventTotal }]] = await db.query(countQuery, countParams);
      total += eventTotal;

      const mappedEvents = events.map((event) => ({
        type: "event",
        id: event.id,
        title: event.title,
        date: event.date,
      }));
      results.push(...mappedEvents);
    }

    // Buscar usuários (artistas e grupos)
    if (type === "all" || type === "users") {
      let userQuery = `
        SELECT id, name, email, role
        FROM users
        WHERE role IN ('artist', 'group')
      `;
      let userCountQuery = `
        SELECT COUNT(*) as total
        FROM users
        WHERE role IN ('artist', 'group')
      `;
      const userParams = [];
      const userCountParams = [];

      if (query) {
        userQuery += " AND (name LIKE ? OR email LIKE ?)";
        userCountQuery += " AND (name LIKE ? OR email LIKE ?)";
        userParams.push(`%${query}%`, `%${query}%`);
        userCountParams.push(`%${query}%`, `%${query}%`);
      }

      // Adicionar LIMIT e OFFSET para paginação
      userQuery += ` LIMIT ? OFFSET ?`;
      userParams.push(limitNum, offset);

      const [users] = await db.query(userQuery, userParams);
      const [[{ total: userTotal }]] = await db.query(
        userCountQuery,
        userCountParams
      );
      total += userTotal;

      results.push(
        ...users.map((user) => ({
          type: "user",
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }))
      );
    }

    res.status(200).json({ results, total });
  } catch (error) {
    console.error("Erro ao buscar:", error);
    res.status(500).json({ error: "Erro ao buscar" });
  }
});

module.exports = router;
