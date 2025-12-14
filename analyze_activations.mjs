import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const email = process.argv[2];

if (!email) {
	console.error('Usage: node analyze_activations.mjs <email>');
	process.exit(1);
}

const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

const bar = () => console.log('='.repeat(70));

try {
	const { data: user, error: userError } = await supabase
		.from('users')
		.select('id, email, balance, frozen_balance, created_at')
		.eq('email', email)
		.single();

	if (userError || !user) {
		console.error('Utilisateur introuvable pour cet email');
		process.exit(1);
	}

	console.log('🔍 ANALYSE DES ACTIVATIONS');
	console.log(`Email: ${user.email}`);
	console.log(`User ID: ${user.id}`);
	console.log(`Balance: ${user.balance} Ⓐ | Frozen: ${user.frozen_balance} Ⓐ`);
	console.log(`Membre depuis: ${user.created_at}`);
	bar();

	const { data: activations, error: actError } = await supabase
		.from('activations')
		.select(
			[
				'id',
				'status',
				'charged',
				'price',
				'frozen_amount',
				'service_code',
				'country_code',
				'provider',
				'operator',
				'phone',
				'external_id',
				'order_id',
				'created_at',
				'expires_at',
				'sms_received_at',
				'cancelled_at'
			].join(',')
		)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(200);

	if (actError) {
		console.error('Erreur lors de la récupération des activations:', actError.message);
		process.exit(1);
	}

	if (!activations || activations.length === 0) {
		console.log('Aucune activation trouvée pour cet utilisateur');
		process.exit(0);
	}

	const countByStatus = activations.reduce((acc, a) => {
		acc[a.status] = (acc[a.status] || 0) + 1;
		return acc;
	}, {});

	const receivedNotCharged = activations.filter(a => a.status === 'received' && !a.charged);
	const frozenButFinal = activations.filter(a => ['timeout', 'cancelled', 'received'].includes(a.status) && parseFloat(a.frozen_amount) > 0);
	const expiredPending = activations.filter(a => {
		if (a.status !== 'pending' || !a.expires_at) return false;
		return new Date(a.expires_at) < new Date();
	});

	console.log('📊 Répartition des statuts:');
	Object.entries(countByStatus).forEach(([status, count]) => {
		console.log(`- ${status}: ${count}`);
	});

	const total = activations.length;
	const chargedCount = activations.filter(a => a.charged).length;
	console.log(`Total activations: ${total} | Charged: ${chargedCount} | Non chargées: ${total - chargedCount}`);
	bar();

	const sample = activations.slice(0, 10);
	console.log('🧾 10 dernières activations:');
	sample.forEach(a => {
		console.log(`• ${a.id}`);
		console.log(`  ${a.status} | charged=${a.charged} | frozen=${a.frozen_amount} | price=${a.price}`);
		console.log(`  service=${a.service_code} ${a.country_code} provider=${a.provider || 'N/A'}`);
		console.log(`  phone=${a.phone || 'N/A'} operator=${a.operator || 'N/A'}`);
		console.log(`  created=${a.created_at} expires=${a.expires_at}`);
		console.log(`  sms_received_at=${a.sms_received_at || 'N/A'} cancelled_at=${a.cancelled_at || 'N/A'}`);
		console.log(`  external_id=${a.external_id || 'N/A'} order_id=${a.order_id || 'N/A'}`);
		console.log('');
	});

	bar();
	console.log('🚨 Points d’attention:');
	console.log(`- Received mais non chargées: ${receivedNotCharged.length}`);
	console.log(`- Frozen > 0 sur statuts finaux: ${frozenButFinal.length}`);
	console.log(`- Pending expirées: ${expiredPending.length}`);

	if (receivedNotCharged.length > 0) {
		console.log('\nExemples non chargés:');
		receivedNotCharged.slice(0, 5).forEach(a => console.log(`• ${a.id} (frozen=${a.frozen_amount})`));
	}

	if (frozenButFinal.length > 0) {
		console.log('\nFrozen à libérer ou charger:');
		frozenButFinal.slice(0, 5).forEach(a => console.log(`• ${a.id} (${a.status}) frozen=${a.frozen_amount}`));
	}

	if (expiredPending.length > 0) {
		console.log('\nPending expirées:');
		expiredPending.slice(0, 5).forEach(a => console.log(`• ${a.id} expires=${a.expires_at}`));
	}

	bar();
	console.log('Terminé');
} catch (err) {
	console.error('Erreur:', err.message);
	process.exit(1);
}
