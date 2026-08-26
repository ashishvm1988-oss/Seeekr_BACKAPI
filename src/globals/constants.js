const table_names = {
    users: 'users', // done
    work_experience: 'work_experience',
    education: 'education', // done
    awards: 'awards', // done
    messages: 'messages',
    review: 'review', // done
    categories: 'categories', // done
    search_analytics: 'search_analytics',
    admin_users: 'admin_users',  // done
    sub_category: 'sub_category', // done
    click_analytics: 'click_analytics',
    portfolio_images: 'portfolio_images',
    provider_subcategories: 'provider_subcategories',
    subscriptions: 'subscriptions'
}

const user_roles = {
    customer: 'customer',
    provider: 'provider'
}

const subscription_status = {
    trial: 'trial',
    active: 'active',
    past_due: 'past_due',
    cancelled: 'cancelled'
}

module.exports = {
    table_names,
    user_roles,
    subscription_status
}

